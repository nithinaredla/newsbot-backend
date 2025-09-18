require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return;
    }

    console.log('🔑 Gemini API Key found:', apiKey.substring(0, 10) + '...');

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use a valid model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    console.log('🧪 Testing Gemini API with model gemini-2.5-pro...');

    const prompt = "Hello, can you respond to this test message?";
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text();

    console.log('✅ Gemini API test successful!');
    console.log('📝 Response:', text);

  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testGemini();
