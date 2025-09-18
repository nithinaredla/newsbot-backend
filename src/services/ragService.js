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
        score: match.score || 0
      })).filter(chunk => chunk.text.trim().length > 0);

    } catch (error) {
      console.error('Error retrieving relevant chunks:', error.message);
      return [];
    }
  }

  async getCollectionStats() {
    try {
      const index = await pineconeService.getIndex();
      const stats = await index.describeIndexStats();
      
      return { 
        count: stats.totalRecordCount || 0, 
        status: 'ok',
        message: `Pinecone index contains ${stats.totalRecordCount || 0} vectors`
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
}

module.exports = new RAGService();