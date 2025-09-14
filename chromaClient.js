const { CloudClient } = require("chromadb");
const GeminiEmbeddingFunction = require("./geminiEmbedder");
require("dotenv").config();

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DB,
});

const embeddingFunction = new GeminiEmbeddingFunction(process.env.GEMINI_API_KEY);

// Test connection function
async function testConnection() {
  try {
    const version = await client.version();
    console.log("Terhubung ke ChromaDB, versi:", version);
    return true;
  } catch (error) {
    console.error("Gagal terhubung ke ChromaDB:", error.message);
    return false;
  }
}

module.exports = { client, embeddingFunction, testConnection };
