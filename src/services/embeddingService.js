const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.jinaApiKey = process.env.JINA_API_KEY;
    if (!this.jinaApiKey) {
      throw new Error('JINA_API_KEY is not set in environment variables');
    }
    this.baseURL = 'https://api.jina.ai/v1/embeddings';
    this.model = 'jina-embeddings-v2-base-en';
  }

  async getEmbedding(text, options = {}) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string');
      }

      const response = await axios.post(
        this.baseURL,
        {
          input: [text],
          model: this.model,
          ...options
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.jinaApiKey}`,
            'Accept-Encoding': 'gzip, deflate, br'
          },
          timeout: 30000,
          timeoutErrorMessage: 'Jina API request timed out'
        }
      );

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        throw new Error('No embedding data received from Jina API');
      }

      const embeddingData = response.data.data[0];
      
      return {
        embedding: embeddingData.embedding,
        model: embeddingData.model || this.model,
        object: embeddingData.object,
        index: embeddingData.index,
        usage: response.data.usage
      };

    } catch (error) {
      console.error('Error in EmbeddingService.getEmbedding:', error.message);
      
      if (error.response) {
        // Jina API returned an error response
        const status = error.response.status;
        const data = error.response.data;
        
        console.error('Jina API error response:', {
          status,
          data,
          text: text.substring(0, 100) + '...' // Log first 100 chars for debugging
        });

        throw new Error(`Jina API error (${status}): ${data.detail || data.message || 'Unknown error'}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('No response received from Jina API. Please check your network connection.');
      } else {
        // Other errors
        throw new Error(`Failed to get embedding: ${error.message}`);
      }
    }
  }

  async getBatchEmbeddings(texts, options = {}) {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Texts must be a non-empty array');
      }

      // Validate each text
      const validTexts = texts.filter(text => 
        text && typeof text === 'string' && text.trim().length > 0
      );

      if (validTexts.length === 0) {
        throw new Error('No valid texts provided for embedding');
      }

      const response = await axios.post(
        this.baseURL,
        {
          input: validTexts,
          model: this.model,
          ...options
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.jinaApiKey}`
          },
          timeout: 45000 // Longer timeout for batch requests
        }
      );

      if (!response.data || !response.data.data) {
        throw new Error('No embedding data received from Jina API');
      }

      return {
        embeddings: response.data.data,
        usage: response.data.usage,
        model: response.data.model || this.model
      };

    } catch (error) {
      console.error('Error in EmbeddingService.getBatchEmbeddings:', error.message);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        throw new Error(`Jina API batch error (${status}): ${data.detail || data.message || 'Unknown error'}`);
      } else {
        throw new Error(`Failed to get batch embeddings: ${error.message}`);
      }
    }
  }

  async validateEmbeddingModel() {
    try {
      // Test with a simple text to verify the API is working
      const testText = 'Hello, world!';
      const result = await this.getEmbedding(testText);
      
      return {
        valid: true,
        model: result.model,
        embeddingLength: result.embedding.length,
        message: 'Embedding service is working correctly'
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        message: 'Embedding service validation failed'
      };
    }
  }

  getEmbeddingDimensions() {
    // Jina Embeddings v2 base model has 768 dimensions
    return 768;
  }

  getMaxBatchSize() {
    // Jina API typically allows up to 128 texts per batch
    return 128;
  }
}

module.exports = new EmbeddingService();