# NewsBot Backend

A Node.js Express backend for a RAG-powered news chatbot that uses Gemini API, Pinecone vector database, and Redis for session management.

## 🚀 Features

- RAG (Retrieval Augmented Generation) pipeline for news queries
- Session-based chat history with Redis
- Pinecone vector database for news article embeddings
- Google Gemini API for response generation
- Jina Embeddings for text vectorization
- RESTful API with proper error handling

## 🛠️ Tech Stack

- **Backend Framework**: Node.js + Express
- **Vector Database**: Pinecone
- **Cache & Sessions**: Redis
- **LLM API**: Google Gemini
- **Embeddings**: Jina AI
- **Authentication**: Session-based
- **Deployment**: Render.com

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd newsbot-backend
Install dependencies:

bash
npm install
Set up environment variables:

bash
cp .env.example .env
Edit .env with your credentials:

env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key
JINA_API_KEY=your_jina_api_key
REDIS_URL=your_redis_url
PINECONE_API_KEY=your_pinecone_api_key
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
Run the development server:

bash
npm run dev
🔌 API Endpoints
POST /api/chat/message - Send a chat message

GET /api/chat/history/:sessionId - Get chat history

DELETE /api/chat/history/:sessionId - Clear chat history

GET /api/chat/status - Get system status

POST /api/session - Create a new session

GET /api/session/:sessionId - Get session info

DELETE /api/session/:sessionId - Delete session

🗄️ Data Ingestion
To ingest news articles into Pinecone:

bash
npm run ingest:bbc
🌐 Deployment
The application is deployed on Render.com. Environment variables are set in the Render dashboard.

📋 Environment Variables
Variable	Description	Required
PORT	Server port	Yes
GEMINI_API_KEY	Google Gemini API key	Yes
JINA_API_KEY	Jina Embeddings API key	Yes
REDIS_URL	Redis connection URL	Yes
PINECONE_API_KEY	Pinecone API key	Yes
NODE_ENV	Environment mode	Yes
CORS_ORIGIN	Allowed frontend origin	Yes
🔧 Development
Use npm run dev for development with hot reload

Use npm start for production

API documentation available at /api-docs (if implemented)

🐛 Troubleshooting
Common issues:

Ensure all API keys are correctly set

Check that Pinecone index exists and has data

Verify Redis connection

Check CORS configuration matches frontend URL
