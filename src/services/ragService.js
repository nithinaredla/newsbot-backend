const embeddingService = require('./embeddingService');
const pineconeService = require('../config/pinecone');

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

  async retrieveRelevantChunks(query, conversationContext = '', topK = 5) {
    try {
      const index = await pineconeService.getIndex();
      
      // Combine current query with conversation context for better retrieval
      const searchQuery = conversationContext ? `${conversationContext} ${query}` : query;
      
      const queryEmbedding = await this.getEmbedding(searchQuery);
      
      const results = await index.query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true,
        includeValues: false
      });

      if (!results.matches || results.matches.length === 0) {
        console.log('No results found for query:', query);
        return [];
      }

      return results.matches.map((match, index) => ({
        text: match.metadata.text || '',
        title: match.metadata.title || 'Unknown Title',
        url: match.metadata.url || '#',
        authors: match.metadata.authors || 'Unknown Author',
        date_publish: match.metadata.date_publish || '',
        chunk_id: match.metadata.chunk_id || index,
        score: match.score || 0,
        distance: match.score || 0 // Pinecone uses score instead of distance
      })).filter(chunk => chunk.text.trim().length > 0);

    } catch (error) {
      console.error('Error retrieving relevant chunks from Pinecone:', error.message);
      
      // Fallback: return empty array instead of throwing error
      return [];
    }
  }

  async getCollectionStats() {
    try {
      const indexStatus = await pineconeService.checkIndexStatus();
      
      if (!indexStatus.exists) {
        return { 
          count: 0, 
          status: 'index_not_found',
          message: 'Pinecone index "news-articles" not found. Please run data ingestion.'
        };
      }

      return { 
        count: indexStatus.totalVectors, 
        status: 'ok',
        message: `Pinecone index contains ${indexStatus.totalVectors} vectors`,
        dimension: indexStatus.dimension
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
      const results = await this.retrieveRelevantChunks(query, '', topK);
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