const { createClient } = require("redis");

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (process.env.REDIS_URL) {
      try {
        this.client = createClient({
          url: process.env.REDIS_URL,
        });

        this.client.on("error", (err) =>
          console.error("Redis Client Error", err),
        );
        this.client.on("connect", () => {
          this.isConnected = true;
          console.log("Redis Client Connected");
        });

        await this.client.connect();
      } catch (error) {
        console.warn(
          "Failed to connect to Redis, proceeding without caching:",
          error.message,
        );
      }
    } else {
      console.warn("REDIS_URL not set, proceeding without caching.");
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected) return;
    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
    }
  }

  async del(key) {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  async flushPattern(pattern) {
    if (!this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error(`Cache FLUSH error for pattern ${pattern}:`, error);
    }
  }
}

const cacheService = new CacheService();
// Initialize connection
cacheService.connect();

module.exports = cacheService;
