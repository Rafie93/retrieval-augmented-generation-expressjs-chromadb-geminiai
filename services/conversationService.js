class ConversationService {
  constructor() {
    this.conversations = new Map();
  }

  // Start new conversation
  startConversation(collectionName, userId) {
    const conversationId = `conv-${userId}-${Date.now()}`;

    const conversation = {
      id: conversationId,
      collectionName: collectionName,
      userId: userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversationId, conversation);
    return conversation;
  }

  // Add message to conversation
  addMessage(conversationId, role, content, context = null) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const message = {
      role: role, // 'user' or 'assistant'
      content: content,
      context: context, // Relevant document chunks used
      timestamp: new Date(),
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    return message;
  }

  // Get conversation history
  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  // Get user's conversations
  getUserConversations(userId) {
    return Array.from(this.conversations.values())
      .filter((conv) => conv.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Generate context-aware response
  async generateResponse(question, contextChunks, conversationHistory = []) {
    // Build context from relevant chunks
    const context = contextChunks.join("\n\n---\n\n");

    // Build conversation history context
    const historyContext = conversationHistory
      .slice(-10) // Last 10 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Enhanced prompt
    const prompt = `Anda adalah asisten AI yang membantu pengguna memahami dokumen mereka.

DOKUMEN REFERENSI:
${context}

${
  historyContext
    ? `HISTORY PERCAKAPAN:
${historyContext}

`
    : ""
}INSTRUKSI:
- Jawablah berdasarkan dokumen referensi di atas
- Jika informasi tidak ada dalam dokumen, katakan dengan jujur
- Gunakan bahasa yang natural dan mudah dimengerti
- Berikan jawaban yang informatif dan helpful

USER QUESTION: ${question}

ASSISTANT RESPONSE:`;

    return this.generateSimpleResponse(question, context);
  }

  generateSimpleResponse(question, context) {
    return `Berdasarkan dokumen yang Anda berikan, berikut informasi relevan:

${context.substring(0, 800)}...

**Jawaban untuk "${question}":**
Informasi yang relevan dengan pertanyaan Anda terdapat dalam teks di atas. Jika Anda需要 informasi lebih spesifik, silakan tanyakan detail yang lebih khusus.`;
  }
}

module.exports = ConversationService;
