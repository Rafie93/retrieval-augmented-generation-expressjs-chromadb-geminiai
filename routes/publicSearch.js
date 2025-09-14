const express = require("express");
const CollectionManager = require("../services/collectionManager");
const ConversationService = require("../services/conversationService");
const router = express.Router();

const collectionManager = new CollectionManager();
const conversationService = new ConversationService();

// Middleware untuk debug
router.use((req, res, next) => {
  console.log("Public Search - Headers:", req.headers);
  console.log("Public Search - Body:", req.body);
  console.log("Public Search - Query:", req.query);
  next();
});

// Public global search (no user_id required)
router.post("/search", async (req, res) => {
  try {
    console.log("Public search request body:", req.body);
    console.log("Public search request headers:", req.headers);

    // Cek jika body kosong
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body is empty",
        received_body: req.body,
      });
    }

    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required for public search",
        received_body: req.body,
      });
    }

    const results = await collectionManager.searchAllCollections(query, limit);

    res.json({
      success: true,
      query: query,
      total_results: results.length,
      results: results,
    });
  } catch (error) {
    console.error("Public search error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all public collections
router.get("/collections", async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const collections = await collectionManager.getAllCollections(limit);

    res.json({
      success: true,
      total_collections: collections.length,
      collections: collections,
    });
  } catch (error) {
    console.error("Public collections error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Public chat (no authentication required)
router.post("/chat", async (req, res) => {
  try {
    console.log("Public chat request body:", req.body);

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body is empty",
      });
    }

    const { question, limit = 5 } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Question is required",
        received_body: req.body,
      });
    }

    const searchResults = await collectionManager.searchAllCollections(question, limit);

    // Generate response
    const contextChunks = searchResults.map((result) => result.text);
    const answer = await conversationService.generateResponse(question, contextChunks);

    res.json({
      success: true,
      question: question,
      answer: answer,
      sources: searchResults.map((result) => ({
        collection: result.collection,
        document: result.text.substring(0, 150) + "...",
        similarity: (1 - result.similarity).toFixed(3),
      })),
      total_sources: searchResults.length,
    });
  } catch (error) {
    console.error("Public chat error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Search collections by keyword (public)
router.get("/search-collections", async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search term (q) is required",
      });
    }

    const allCollections = await collectionManager.getAllCollections(100);

    const filteredCollections = allCollections.filter((collection) => {
      const searchableText = [collection.name, collection.metadata?.original_filename, collection.metadata?.description, collection.metadata?.tags].filter(Boolean).join(" ").toLowerCase();

      return searchableText.includes(q.toLowerCase());
    });

    res.json({
      success: true,
      search_term: q,
      total_collections: filteredCollections.length,
      collections: filteredCollections.slice(0, limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Public search API is working",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
