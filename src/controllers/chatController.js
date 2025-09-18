const ragService = require('../services/ragService');
const geminiService = require('../config/gemini');
const redisClient = require('../config/redis');

class ChatController {
  async handleMessage(req, res, next) {
    try {
      const { message, sessionId } = req.body;
      
      if (!message || !sessionId) {
        return res.status(400).json({ 
          error: 'Message and sessionId are required'
        });
      }

      // Store user message in Redis
      await this.storeMessage(sessionId, 'user', message.trim());

      // Get conversation context from previous messages (limit to last 3 messages)
      const conversationContext = await this.getConversationContext(sessionId, 3);
      
      console.log('Conversation context length:', conversationContext.length);
      
      // Retrieve relevant news chunks with conversation context
      const relevantChunks = await ragService.retrieveRelevantChunks(
        message.trim(), 
        conversationContext
      );
      
      console.log('Retrieved', relevantChunks.length, 'relevant chunks');
      
      // Generate response using Gemini with full conversation context
      const botResponse = await this.generateResponse(
        message.trim(), 
        relevantChunks,
        conversationContext
      );
      
      if (!botResponse || botResponse.trim() === '') {
        throw new Error('Received empty response from AI service');
      }
      
      // Store bot response in Redis
      await this.storeMessage(sessionId, 'assistant', botResponse);

      res.json({ 
        response: botResponse, 
        relevantArticles: relevantChunks,
        sessionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in handleMessage:', error);
      next(error);
    }
  }

  async getConversationContext(sessionId, maxMessages = 3) {
    try {
      const client = await redisClient.getClient();
      const messages = await client.lRange(`session:${sessionId}:messages`, 0, -1);
      
      // Get only assistant messages (bot responses) for context, limit length
      const assistantMessages = messages
        .map(msg => {
          try {
            const parsed = JSON.parse(msg);
            return parsed.role === 'assistant' ? parsed.content : null;
          } catch {
            return null;
          }
        })
        .filter(msg => msg !== null)
        .slice(-maxMessages)
        .map(msg => msg.substring(0, 1000)); // Limit each message length

      return assistantMessages.join(' ');
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return '';
    }
  }

  async generateResponse(query, relevantChunks, conversationContext = '') {
    try {
      let context = "No relevant news articles found.";
      
      if (relevantChunks && relevantChunks.length > 0) {
        context = relevantChunks.slice(0, 3).map((chunk, index) => 
          `[Article ${index + 1}] ${chunk.title}: ${chunk.text.substring(0, 500)}...`
        ).join('\n\n');
      }

      const prompt = `
You are a helpful news assistant. Use the following news articles to answer the user's question.

CONVERSATION HISTORY (for context only):
${conversationContext || 'No previous conversation'}

RELEVANT NEWS ARTICLES:
${context}

USER'S CURRENT QUESTION: ${query}

INSTRUCTIONS:
1. Answer based ONLY on the news articles provided above
2. If the articles don't contain relevant information, say: "I don't have enough information about that from the current news sources."
3. Keep your response concise and factual
4. If the user asks for "more info" or "details", provide additional context from the articles
5. Do not make up information not present in the articles

ANSWER:`;

      console.log('Prompt length:', prompt.length);
      
      const response = await geminiService.generateContent(prompt);
      
      if (!response || response.trim() === '') {
        return "I apologize, but I couldn't generate a response. Please try again with a different question.";
      }
      
      return response;

    } catch (error) {
      console.error('Error generating response:', error);
      return "I'm having trouble accessing the news information right now. Please try again in a moment.";
    }
  }

  async storeMessage(sessionId, role, content) {
    try {
      const client = await redisClient.getClient();
      const message = { 
        role, 
        content, 
        timestamp: new Date().toISOString() 
      };
      
      await client.lPush(`session:${sessionId}:messages`, JSON.stringify(message));
      await client.expire(`session:${sessionId}:messages`, 86400); // 24h TTL
    } catch (error) {
      console.error('Error storing message in Redis:', error);
      // Don't throw error to avoid breaking the chat flow
    }
  }

  async getChatHistory(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const client = await redisClient.getClient();
      const messages = await client.lRange(`session:${sessionId}:messages`, 0, -1);
      
      const parsedMessages = messages.map(msg => {
        try {
          return JSON.parse(msg);
        } catch (parseError) {
          console.error('Error parsing message:', parseError);
          return null;
        }
      }).filter(msg => msg !== null);

      res.json({ 
        messages: parsedMessages,
        sessionId,
        count: parsedMessages.length
      });

    } catch (error) {
      next(error);
    }
  }

  async clearChatHistory(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const client = await redisClient.getClient();
      await client.del(`session:${sessionId}:messages`);
      
      res.json({ 
        message: 'Chat history cleared successfully',
        sessionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  async getSystemStatus(req, res, next) {
    try {
      const redisStatus = await redisClient.isConnected;
      const chromaStatus = await chromaService.isReady();
      const collectionStats = await ragService.getCollectionStats();

      res.json({
        status: 'ok',
        services: {
          redis: redisStatus ? 'connected' : 'disconnected',
          chroma: chromaStatus ? 'connected' : 'disconnected',
          gemini: !!process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
          jina: !!process.env.JINA_API_KEY ? 'configured' : 'not_configured'
        },
        database: {
          collection: 'news_articles',
          documentCount: collectionStats.count,
          status: collectionStats.status
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();