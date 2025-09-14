const express = require("express");
const { client, embeddingFunction } = require("../chromaClient");
const router = express.Router();

// Process text chunks from UI
router.post("/process-text", async (req, res) => {
  try {
    const { collectionName, chunks, metadata } = req.body;

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Chunks are required and must be a non-empty array",
      });
    }

    // Create or get collection
    const collection = await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: embeddingFunction,
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
        total_chunks: chunks.length,
        source: "laravel_processing",
      },
    });

    // Prepare documents for ChromaDB
    const documents = [];
    const metadatas = [];
    const ids = [];

    chunks.forEach((chunk, index) => {
      documents.push(chunk);
      metadatas.push({
        ...metadata,
        chunk_index: index,
        chunk_size: chunk.length,
        processed_at: new Date().toISOString(),
      });
      ids.push(`chunk-${index}-${Date.now()}`);
    });

    // Add to ChromaDB in batches to avoid timeouts
    const batchSize = 50;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batchDocs = documents.slice(i, i + batchSize);
      const batchMetadatas = metadatas.slice(i, i + batchSize);
      const batchIds = ids.slice(i, i + batchSize);

      await collection.add({
        documents: batchDocs,
        metadatas: batchMetadatas,
        ids: batchIds,
      });

      console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(documents.length / batchSize)}`);
    }

    res.json({
      success: true,
      message: `Successfully processed ${chunks.length} text chunks`,
      collection: collectionName,
      total_chunks: chunks.length,
      collection_metadata: await collection.count(),
    });
  } catch (error) {
    console.error("Error processing text:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Query endpoint
router.post("/query", async (req, res) => {
  try {
    const { collectionName, question, nResults = 5, user_id } = req.body;

    const collection = await client.getCollection({
      name: collectionName,
      embeddingFunction: embeddingFunction,
    });

    // Verify collection belongs to user (optional security check)
    const collectionInfo = await collection.get();
    if (user_id && collectionInfo.metadata.user_id != user_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this collection",
      });
    }

    // Query ChromaDB for similar chunks
    const results = await collection.query({
      queryTexts: [question],
      nResults: nResults,
      where: user_id ? { user_id: user_id } : {},
    });

    // Format response
    const context = results.documents[0].join("\n\n");
    const answer = await generateContextualAnswer(question, context);

    res.json({
      success: true,
      question: question,
      answer: answer,
      relevant_chunks: results.documents[0],
      similarities: results.distances[0],
      metadata: results.metadatas[0],
    });
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get user collections
router.get("/collections/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const allCollections = await client.listCollections();

    // Filter collections by user ID in metadata
    const userCollections = [];

    for (const col of allCollections) {
      try {
        const collection = await client.getCollection({ name: col.name });
        const info = await collection.get();

        if (info.metadata.user_id == userId) {
          userCollections.push({
            name: col.name,
            metadata: info.metadata,
            count: await collection.count(),
          });
        }
      } catch (error) {
        console.log(`Skipping collection ${col.name}:`, error.message);
      }
    }

    res.json({
      success: true,
      user_id: userId,
      collections: userCollections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

async function generateContextualAnswer(question, context) {
  return `Berdasarkan dokumen yang relevan:

${context.substring(0, 1000)}...

Untuk pertanyaan "${question}", informasi di atas mungkin dapat membantu.`;
}

module.exports = router;
