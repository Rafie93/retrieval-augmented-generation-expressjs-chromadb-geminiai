const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { client, embeddingFunction } = require("../chromaClient");
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// PDF Upload and Processing endpoint
router.post("/process-pdf", upload.single("pdf"), async (req, res) => {
  try {
    const { originalname, buffer } = req.file;
    const { collectionName, chunkSize = 1000 } = req.body;

    // Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Split text into chunks
    const chunks = splitTextIntoChunks(text, chunkSize);

    // Create or get collection
    const collection = await client.getOrCreateCollection({
      name: collectionName || `pdf-${Date.now()}`,
      embeddingFunction: embeddingFunction,
    });

    // Generate embeddings and store in ChromaDB
    const documents = chunks.map((chunk, index) => ({
      text: chunk,
      metadata: {
        pdf_name: originalname,
        chunk_index: index,
        chunk_size: chunk.length,
        total_chunks: chunks.length,
        processed_at: new Date().toISOString(),
      },
    }));

    // Add to ChromaDB in batches
    for (let i = 0; i < documents.length; i += 50) {
      const batch = documents.slice(i, i + 50);
      await collection.add({
        documents: batch.map((d) => d.text),
        metadatas: batch.map((d) => d.metadata),
        ids: batch.map((_, index) => `chunk-${i + index}`),
      });
    }

    res.json({
      success: true,
      message: `PDF processed successfully. ${chunks.length} chunks stored.`,
      collection: collection.name,
      total_chunks: chunks.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Query PDF content endpoint
router.post("/query-pdf", async (req, res) => {
  try {
    const { collectionName, question, nResults = 5 } = req.body;

    const collection = await client.getCollection({
      name: collectionName,
      embeddingFunction: embeddingFunction,
    });

    // Search for relevant text chunks
    const results = await collection.query({
      queryTexts: [question],
      nResults: nResults,
      where: {}, // Optional: filter by metadata
    });

    // Format response with context
    const context = results.documents[0].join("\n\n");
    const answer = await generateAnswer(question, context);

    res.json({
      success: true,
      question: question,
      answer: answer,
      relevant_chunks: results.documents[0],
      metadata: results.metadatas[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function to split text into chunks
function splitTextIntoChunks(text, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

// Simple answer generation (bisa diganti dengan LLM yang lebih advanced)
async function generateAnswer(question, context) {
  // Ini bisa di-integrate dengan GPT, Gemini, atau LLM lain
  return `Berdasarkan dokumen yang diberikan: ${context.substring(0, 500)}... 
    
Untuk pertanyaan "${question}", jawaban dapat ditemukan dalam teks di atas.`;
}

module.exports = router;
