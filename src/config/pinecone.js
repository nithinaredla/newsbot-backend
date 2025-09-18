const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    this.index = null;
    this.initialize();
  }

  async initialize() {
    try {
      this.index = this.pinecone.Index('news-articles');
      console.log('Pinecone index initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      throw error;
    }
  }

  async getIndex() {
    if (!this.index) {
      await this.initialize();
    }
    return this.index;
  }

  async isReady() {
    try {
      await this.getIndex();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new PineconeService();