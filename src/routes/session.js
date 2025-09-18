const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Session management endpoints
router.post('/', sessionController.createSession.bind(sessionController));
router.get('/:sessionId', sessionController.getSessionInfo.bind(sessionController));
router.delete('/:sessionId', sessionController.deleteSession.bind(sessionController));
router.get('/', sessionController.listSessions.bind(sessionController));

module.exports = router;