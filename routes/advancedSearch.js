const express = require("express");
const CollectionManager = require("../services/collectionManager");
const ConversationService = require("../services/conversationService");
const router = express.Router();

const collectionManager = new CollectionManager();
const conversationService = new ConversationService();

// Middleware untuk log requests
router.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params,
  });
  next();
});

// Global search across all collections - FIXED
router.post("/global-search", async (req, res) => {
  try {
    // ✅ Safe destructuring dengan default values
    const { query, user_id, limit = 10 } = req.body || {};

    console.log("Request body:", req.body); // Debug log

    if (!query || !user_id) {
      return res.status(400).json({
        success: false,
        error: "Query and user_id are required",
        received_body: req.body, // Untuk debugging
      });
    }

    const results = await collectionManager.searchAcrossCollections(query, user_id, limit);

    res.json({
      success: true,
      query: query,
      total_results: results.length,
      results: results,
    });
  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Search collections by name/metadata - FIXED
router.get("/search-collections", async (req, res) => {
  try {
    // ✅ Safe destructuring untuk query parameters
    const { q, user_id, limit = 20 } = req.query;

    console.log("Query params:", req.query); // Debug log

    if (!q || !user_id) {
      return res.status(400).json({
        success: false,
        error: "Search term (q) and user_id are required",
        received_query: req.query,
      });
    }

    const collections = await collectionManager.searchCollections(q, user_id, limit);

    res.json({
      success: true,
      search_term: q,
      total_collections: collections.length,
      collections: collections,
    });
  } catch (error) {
    console.error("Collection search error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get user collection statistics - FIXED
router.get("/user/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("User stats params:", req.params); // Debug log

    const stats = await collectionManager.getCollectionStats(userId);

    res.json({
      success: true,
      user_id: userId,
      stats: stats,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/global-chat", async (req, res) => {
  try {
    const { question, user_id, conversationId, limit = 7 } = req.body || {};

    console.log("Global chat body:", req.body); // Debug log

    if (!question || !user_id) {
      return res.status(400).json({
        success: false,
        error: "Question and user_id are required",
        received_body: req.body,
      });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = conversationService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found",
        });
      }
    } else {
      conversation = conversationService.startConversation("global-search", user_id);
    }

    // Search across all collections
    const searchResults = await collectionManager.searchAcrossCollections(question, user_id, limit);

    // Add user message
    conversationService.addMessage(conversation.id, "user", question);

    // Generate response using top results
    const contextChunks = searchResults.map((result) => result.text);
    const history = conversation.messages;

    const answer = await conversationService.generateResponse(question, contextChunks, history);

    // Add assistant response with sources
    conversationService.addMessage(conversation.id, "assistant", answer, searchResults.slice(0, 3));

    res.json({
      success: true,
      conversationId: conversation.id,
      question: question,
      answer: answer,
      sources: searchResults.map((result) => ({
        collection: result.collection,
        document: result.text.substring(0, 200) + "...",
        similarity: result.similarity,
        metadata: result.metadata,
      })),
      total_sources: searchResults.length,
    });
  } catch (error) {
    console.error("Global chat error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint untuk testing
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Advanced search API is working",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
