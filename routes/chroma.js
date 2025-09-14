const express = require("express");
const { client, embeddingFunction, testConnection } = require("../chromaClient");
const router = express.Router();
// Helper function untuk metadata collection
function ensureCollectionMetadata(metadata = {}) {
  return {
    created_at: new Date().toISOString(),
    description: "Collection for storing documents",
    version: "1.0",
    type: "general",
    ...metadata,
  };
}

// Helper function untuk metadata dokumen
function ensureDocumentMetadata(document, customMetadata = {}) {
  return {
    added_at: new Date().toISOString(),
    source: "api",
    length: document.length,
    language: "id",
    ...customMetadata,
  };
}
// Middleware untuk test koneksi
router.use(async (req, res, next) => {
  const isConnected = await testConnection();
  if (!isConnected) {
    return res.status(500).json({
      success: false,
      error: "Tidak dapat terhubung ke ChromaDB",
    });
  }
  next();
});

// Helper function untuk mendapatkan collection
async function getCollection(collectionName) {
  return await client.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: embeddingFunction,
  });
}

// Create collection dengan Gemini embedding
router.post("/collections", async (req, res) => {
  try {
    const { name, metadata } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Nama collection diperlukan",
      });
    }

    // Pastikan metadata tidak kosong
    const collectionMetadata = {
      ...metadata,
      created_at: new Date().toISOString(),
      description: metadata?.description || `Collection ${name}`,
      type: metadata?.type || "general",
    };

    const collection = await client.createCollection({
      name,
      metadata: collectionMetadata,
      embeddingFunction: embeddingFunction,
    });

    res.json({
      success: true,
      collection: {
        name: collection.name,
        metadata: collection.metadata,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/collections/get-or-create", async (req, res) => {
  try {
    const { name, metadata } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Nama collection diperlukan",
      });
    }

    // Pastikan metadata tidak kosong
    const collectionMetadata = {
      ...metadata,
      created_at: new Date().toISOString(),
      description: metadata?.description || `Collection ${name}`,
      type: metadata?.type || "general",
    };

    const collection = await client.getOrCreateCollection({
      name,
      metadata: collectionMetadata,
      embeddingFunction: embeddingFunction,
    });

    res.json({
      success: true,
      collection: {
        name: collection.name,
        metadata: collection.metadata,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/collections/:name/documents", async (req, res) => {
  try {
    const { name } = req.params;
    const { documents, metadatas, ids } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Dokumen diperlukan dan harus berupa array",
      });
    }

    console.log(`Menambahkan ${documents.length} dokumen ke collection ${name}...`);

    const collection = await getCollection(name);

    // Buat metadata default untuk setiap dokumen
    const defaultMetadatas = documents.map((doc, index) => ({
      added_at: new Date().toISOString(),
      source: "api",
      length: doc.length,
      ...(metadatas && metadatas[index] ? metadatas[index] : {}),
    }));

    const result = await collection.add({
      documents,
      metadatas: defaultMetadatas,
      ids: ids || documents.map((_, index) => `doc-${Date.now()}-${index}`),
    });

    res.json({
      success: true,
      result: result,
      message: `Berhasil menambahkan ${documents.length} dokumen ke collection ${name}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Query documents dengan Gemini embedding
router.post("/collections/:name/query", async (req, res) => {
  try {
    const { name } = req.params;
    const { queryTexts, nResults, where } = req.body;

    if (!queryTexts || !Array.isArray(queryTexts) || queryTexts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Query texts diperlukan dan harus berupa array",
      });
    }

    console.log(`Querying: ${queryTexts[0].substring(0, 50)}...`);

    const collection = await getCollection(name);
    const results = await collection.query({
      queryTexts,
      nResults: nResults || 5,
      where: where || {},
    });

    res.json({
      success: true,
      results: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Endpoint lainnya tetap sama seperti sebelumnya...
// [GET] /collections
// [GET] /collections/:name
// [DELETE] /collections/:name
// [GET] /health

module.exports = router;
