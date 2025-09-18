const redisClient = require('../config/redis');
const { validateSessionId } = require('../utils/helpers');

class SessionController {
  async createSession(req, res, next) {
    try {
      const { sessionId } = req.body;
      
      if (sessionId && !validateSessionId(sessionId)) {
        return res.status(400).json({
          error: 'Invalid session ID format',
          message: 'Session ID must be at least 20 characters and contain only letters, numbers, underscores, and hyphens'
        });
      }

      const newSessionId = sessionId || this.generateSessionId();
      
      // Initialize empty session in Redis
      const client = await redisClient.getClient();
      await client.set(`session:${newSessionId}:created`, new Date().toISOString());
      await client.expire(`session:${newSessionId}:created`, 86400); // 24h TTL

      res.status(201).json({
        sessionId: newSessionId,
        message: 'Session created successfully',
        timestamp: new Date().toISOString(),
        expiresIn: '24 hours'
      });

    } catch (error) {
      next(error);
    }
  }

  async getSessionInfo(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      if (!validateSessionId(sessionId)) {
        return res.status(400).json({
          error: 'Invalid session ID format'
        });
      }

      const client = await redisClient.getClient();
      
      // Get session creation time
      const createdAt = await client.get(`session:${sessionId}:created`);
      
      // Get message count
      const messageCount = await client.lLen(`session:${sessionId}:messages`);
      
      // Get TTL
      const ttl = await client.ttl(`session:${sessionId}:messages`);

      if (!createdAt) {
        return res.status(404).json({
          error: 'Session not found',
          sessionId
        });
      }

      res.json({
        sessionId,
        createdAt,
        messageCount,
        ttlSeconds: ttl,
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
        status: 'active'
      });

    } catch (error) {
      next(error);
    }
  }

  async deleteSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      if (!validateSessionId(sessionId)) {
        return res.status(400).json({
          error: 'Invalid session ID format'
        });
      }

      const client = await redisClient.getClient();
      
      // Delete all session-related keys
      const keys = await client.keys(`session:${sessionId}:*`);
      
      if (keys.length === 0) {
        return res.status(404).json({
          error: 'Session not found',
          sessionId
        });
      }

      // Delete all keys
      for (const key of keys) {
        await client.del(key);
      }

      res.json({
        message: 'Session deleted successfully',
        sessionId,
        deletedKeys: keys.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  async listSessions(req, res, next) {
    try {
      const client = await redisClient.getClient();
      
      // Get all session keys
      const sessionKeys = await client.keys('session:*:created');
      
      const sessions = [];
      
      for (const key of sessionKeys) {
        const sessionId = key.split(':')[1];
        const createdAt = await client.get(key);
        const messageCount = await client.lLen(`session:${sessionId}:messages`);
        const ttl = await client.ttl(key);

        sessions.push({
          sessionId,
          createdAt,
          messageCount,
          ttlSeconds: ttl,
          expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
        });
      }

      res.json({
        totalSessions: sessions.length,
        sessions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new SessionController();