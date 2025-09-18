const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Updated to use the new connection format
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('Too many retries on Redis. Connection terminated');
              return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
          }
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async getClient() {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

module.exports = new RedisClient();