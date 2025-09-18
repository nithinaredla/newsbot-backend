const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initialize();
  }

  initialize() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048, // Increased from 1024
        }
      });
      
      console.log('Gemini service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      throw error;
    }
  }

  async generateContent(prompt) {
    try {
      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }

      // Truncate prompt if it's too long (Gemini has token limits)
      const truncatedPrompt = prompt.length > 30000 
        ? prompt.substring(0, 30000) + "... [truncated due to length]"
        : prompt;

      console.log('Sending prompt to Gemini, length:', truncatedPrompt.length);
      
      const result = await this.model.generateContent(truncatedPrompt);
      const response = await result.response;
      
      if (!response.text()) {
        throw new Error('Empty response from Gemini API');
      }
      
      return response.text();
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      
      // More specific error messages
      if (error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      } else if (error.message.includes('permission')) {
        throw new Error('Gemini API permission denied. Check your API key.');
      } else if (error.message.includes('network')) {
        throw new Error('Network error connecting to Gemini API.');
      }
      
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();