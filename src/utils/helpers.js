const { v4: uuidv4 } = require('uuid');

function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Session ID validation: alphanumeric, underscores, hyphens, min 10 chars
  const sessionIdRegex = /^[a-zA-Z0-9_-]{10,100}$/;
  return sessionIdRegex.test(sessionId);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .substring(0, 1000) // Limit length
    .replace(/[<>]/g, '') // Basic HTML sanitization
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function generateSessionId() {
  return `sess_${Date.now()}_${uuidv4().substr(0, 8)}`;
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

module.exports = {
  validateSessionId,
  sanitizeInput,
  formatTimestamp,
  generateSessionId,
  isValidHttpUrl,
  delay,
  chunkArray
};