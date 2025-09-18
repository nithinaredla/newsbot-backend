const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Chat endpoints
router.post('/message', chatController.handleMessage.bind(chatController));
router.get('/history/:sessionId', chatController.getChatHistory.bind(chatController));
router.delete('/history/:sessionId', chatController.clearChatHistory.bind(chatController));

// System status
router.get('/status', chatController.getSystemStatus.bind(chatController));

module.exports = router;