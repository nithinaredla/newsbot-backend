const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      const apiKey = process.env.PINECONE_API_KEY;
      if (!apiKey) {
        throw new Error('PINECONE_API_KEY is not set in environment variables');
      }

      this.pinecone = new Pinecone({
        apiKey: apiKey,
      });

      // Check if index exists
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes.some(index => index.name === 'news-articles');

      if (indexExists) {
        this.index = this.pinecone.Index('news-articles');
        console.log('Pinecone index "news-articles" loaded successfully');
      } else {
        console.warn('Pinecone index "news-articles" does not exist. Please run data ingestion first.');
        this.index = null;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error.message);
      this.isInitialized = false;
      throw error;
    }
  }

  async getIndex() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.index) {
      throw new Error('Pinecone index not available. Please ensure the index exists and data is ingested.');
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

  async checkIndexStatus() {
    try {
      const index = await this.getIndex();
      const stats = await index.describeIndexStats();
      return {
        exists: true,
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension,
        status: 'active'
      };
    } catch (error) {
      return {
        exists: false,
        totalVectors: 0,
        error: error.message
      };
    }
  }
}

module.exports = new PineconeService();