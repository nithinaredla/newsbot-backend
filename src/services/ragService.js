const embeddingService = require('./embeddingService');
const chromaService = require('../config/chroma');

class RAGService {
  constructor() {
    this.embeddingService = embeddingService;
  }

  async getEmbedding(query) {
    try {
      const result = await this.embeddingService.getEmbedding(query);
      return result.embedding;
    } catch (error) {
      console.error('Error getting embedding:', error.message);
      throw new Error(`Failed to get embedding: ${error.message}`);
    }
  }

  async retrieveRelevantChunks(query, conversationContext = '', topK = 12) {
    try {
      const collection = await chromaService.getCollection();
      if (!collection) {
        throw new Error('Chroma collection not available. Please check if the collection exists and Chroma server is running.');
      }

      // Combine current query with conversation context for better retrieval
      const searchQuery = conversationContext ? `${conversationContext} ${query}` : query;
      
      const queryEmbedding = await this.getEmbedding(searchQuery);
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        include: ['metadatas', 'distances', 'documents']
      });

      if (!results.metadatas || results.metadatas.length === 0) {
        console.log('No results found for query:', query);
        return [];
      }

      return results.metadatas[0].map((metadata, index) => ({
        text: metadata.text || results.documents[0][index] || '',
        title: metadata.title || 'Unknown Title',
        url: metadata.url || '#',
        authors: metadata.authors || 'Unknown Author',
        date_publish: metadata.date_publish || '',
        chunk_id: metadata.chunk_id || index,
        score: results.distances[0][index] || 0,
        distance: results.distances[0][index] || 0
      })).filter(chunk => chunk.text.trim().length > 0);

    } catch (error) {
      console.error('Error retrieving relevant chunks:', error.message);
      return [];
    }
  }

  async getCollectionStats() {
    try {
      const collection = await chromaService.getCollection();
      if (!collection) {
        return { 
          count: 0, 
          status: 'collection_not_found',
          message: 'News articles collection not found in ChromaDB'
        };
      }

      const count = await collection.count();
      return { 
        count, 
        status: 'ok',
        message: `Collection contains ${count} chunks`
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      return { 
        count: 0, 
        status: 'error', 
        error: error.message,
        message: 'Failed to get collection statistics'
      };
    }
  }

  async testRetrieval(query = "technology news", topK = 2) {
    try {
      const results = await this.retrieveRelevantChunks(query, topK);
      return {
        success: true,
        query,
        results,
        count: results.length
      };
    } catch (error) {
      return {
        success: false,
        query,
        error: error.message,
        results: []
      };
    }
  }
}

module.exports = new RAGService();