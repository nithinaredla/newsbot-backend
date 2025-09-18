const requestLogger = require('./middleware/logger');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      'https://relaxed-vacherin-7fe89c.netlify.app', // Replace with your actual Netlify URL
      'http://localhost:3000'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// Logger middleware
app.use(requestLogger);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chat', require('./routes/chat'));
app.use('/api/session', require('./routes/session'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'News Chatbot API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'News Chatbot API',
    version: '1.0.0',
    description: 'RAG-powered chatbot for news websites',
    endpoints: {
      chat: {
        'POST /api/chat/message': 'Send a chat message',
        'GET /api/chat/history/:sessionId': 'Get chat history',
        'DELETE /api/chat/history/:sessionId': 'Clear chat history',
        'GET /api/chat/status': 'Get system status'
      },
      session: {
        'POST /api/session': 'Create a new session',
        'GET /api/session': 'List all sessions',
        'GET /api/session/:sessionId': 'Get session info',
        'DELETE /api/session/:sessionId': 'Delete session',
        'POST /api/session/cleanup': 'Cleanup expired sessions'
      }
    }
  });
});

// 404 handler - Use Express's built-in approach
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    suggestion: 'Visit /api for available endpoints'
  });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

module.exports = app;