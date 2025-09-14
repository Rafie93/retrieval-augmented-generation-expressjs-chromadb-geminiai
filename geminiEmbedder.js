const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiEmbeddingFunction {
  constructor(apiKey) {
    if (!apiKey) {
      console.warn("⚠️  GEMINI_API_KEY tidak ditemukan. Menggunakan mode dummy embedding untuk testing.");
      this.dummyMode = true;
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "embedding-001",
    });
    this.dummyMode = false;
    console.log("✅ Gemini Embedding Function diinisialisasi");
  }

  async generate(texts) {
    if (this.dummyMode) {
      return this.generateDummyEmbeddings(texts);
    }

    try {
      const embeddings = [];

      for (const text of texts) {
        try {
          const result = await this.model.embedContent(text);
          const embedding = result.embedding.values;
          embeddings.push(embedding);
        } catch (error) {
          console.warn(`Error embedding text: ${text.substring(0, 50)}...`, error.message);
          embeddings.push(this.generateDummyEmbedding(text));
        }
      }

      return embeddings;
    } catch (error) {
      console.error("Error dalam Gemini embedding:", error.message);
      return this.generateDummyEmbeddings(texts);
    }
  }

  generateDummyEmbeddings(texts) {
    return texts.map((text) => this.generateDummyEmbedding(text));
  }

  generateDummyEmbedding(text) {
    const embedding = new Array(768).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    words.forEach((word, index) => {
      const hash = this.hashString(word);
      const position = hash % embedding.length;
      embedding[position] = (embedding[position] + 1) * 0.1;
    });

    return embedding;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// Ekspor class secara langsung
module.exports = GeminiEmbeddingFunction;
