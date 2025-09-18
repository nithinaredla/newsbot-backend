const { ChromaClient } = require('chromadb');

class ChromaService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.initialize();
  }

  async initialize() {
    try {
      this.client = new ChromaClient({ 
        path: `http://${process.env.CHROMA_HOST}:${process.env.CHROMA_PORT}` 
      });

      // Check if collection exists
      const collections = await this.client.listCollections();
      const newsCollection = collections.find(c => c.name === "news_articles");
      
      if (newsCollection) {
        this.collection = await this.client.getCollection({ name: "news_articles" });
        console.log('ChromaDB collection loaded successfully');
      } else {
        console.warn('ChromaDB collection "news_articles" not found');
        this.collection = null;
      }
    } catch (error) {
      console.error('Failed to initialize Chroma service:', error);
      throw error;
    }
  }

  async getCollection() {
    if (!this.collection) {
      await this.initialize();
    }
    return this.collection;
  }

  async isReady() {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new ChromaService();