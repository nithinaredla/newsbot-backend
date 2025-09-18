const { ChromaClient } = require('chromadb');

class ChromaService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isAvailable = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Only initialize if CHROMA_HOST is set
      if (!process.env.CHROMA_HOST || process.env.CHROMA_HOST === 'localhost') {
        console.log('ChromaDB not configured for production. Using fallback mode.');
        this.isAvailable = false;
        return;
      }

      this.client = new ChromaClient({ 
        path: `http://${process.env.CHROMA_HOST}:${process.env.CHROMA_PORT || 8000}` 
      });

      const collections = await this.client.listCollections();
      const newsCollection = collections.find(c => c.name === "news_articles");
      
      if (newsCollection) {
        this.collection = await this.client.getCollection({ name: "news_articles" });
        this.isAvailable = true;
        console.log('ChromaDB collection loaded successfully');
      } else {
        console.warn('ChromaDB collection "news_articles" not found');
        this.isAvailable = false;
      }
    } catch (error) {
      console.warn('ChromaDB not available, using fallback mode:', error.message);
      this.isAvailable = false;
    }
  }

  async getCollection() {
    if (!this.isAvailable) {
      throw new Error('ChromaDB not available in production');
    }
    return this.collection;
  }

  async isReady() {
    return this.isAvailable;
  }
}

module.exports = new ChromaService();