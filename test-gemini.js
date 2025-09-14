require("dotenv").config();
const GeminiEmbeddingFunction = require("./geminiEmbedder");

async function testGeminiEmbedding() {
  const embedder = new GeminiEmbeddingFunction("AIzaSyALh32Dl0P1U3Upaje5M1N54Piv_msayNE");

  const texts = ["ChromaDB adalah vector database", "Google Gemini adalah model AI dari Google", "Embedding adalah representasi vektor dari teks"];

  console.log("Testing Gemini Embedding...");

  try {
    const embeddings = await embedder.generate(texts);
    console.log("✅ Embedding berhasil dibuat");
    console.log("Jumlah teks:", texts.length);
    console.log("Dimensi embedding:", embeddings[0].length);
    console.log("Contoh embedding pertama:", embeddings[0].slice(0, 5));
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testGeminiEmbedding();
