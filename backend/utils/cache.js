let redis;
let client;

// Try to import Redis, but don't fail if it's not available
try {
  redis = require('redis');
  
  // Create Redis client
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with a individual error
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands with a individual error
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        // End reconnecting with built in error
        return undefined;
      }
      // Reconnect after
      return Math.min(options.attempt * 100, 3000);
    }
  });

  // Connect to Redis
  client.connect().catch(console.error);

  // Handle connection events
  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  // Only log the first error, then suppress further logs
  let redisErrorLogged = false;
  client.on('error', (err) => {
    if (!redisErrorLogged) {
      console.error('❌ Redis error:', err.message);
      console.log('⚠️  Redis unavailable, running without caching. To remove this warning, install and start Redis or set REDIS_URL to blank.');
      redisErrorLogged = true;
    }
    // Do not log further errors
  });

  client.on('end', () => {
    console.log('🔌 Redis disconnected');
  });
} catch (error) {
  console.log('⚠️ Redis not available, running without caching');
  client = null;
}

// Cache utility functions
const cache = {
  // Set cache with expiration
  async set(key, value, expireSeconds = 3600) {
    if (!client) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      await client.setEx(key, expireSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  // Get cache value
  async get(key) {
    if (!client) return null;
    
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Delete cache key
  async del(key) {
    if (!client) return true;
    
    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    if (!client) return true;
    
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    if (!client) return false;
    
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  // Set cache if not exists
  async setNX(key, value, expireSeconds = 3600) {
    if (!client) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      const result = await client.setNX(key, serializedValue);
      if (result) {
        await client.expire(key, expireSeconds);
      }
      return result;
    } catch (error) {
      console.error('Cache setNX error:', error);
      return false;
    }
  },

  // Increment counter
  async incr(key) {
    if (!client) return null;
    
    try {
      return await client.incr(key);
    } catch (error) {
      console.error('Cache incr error:', error);
      return null;
    }
  },

  // Get cache statistics
  async getStats() {
    if (!client) return null;
    
    try {
      const info = await client.info();
      return info;
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  },

  // Clear all cache
  async clear() {
    if (!client) return true;
    
    try {
      await client.flushAll();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  },

  // Close Redis connection
  async close() {
    if (!client) return true;
    
    try {
      await client.quit();
      return true;
    } catch (error) {
      console.error('Cache close error:', error);
      return false;
    }
  }
};

// Cache middleware for Express routes
const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    if (!client) {
      return next();
    }

    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests (user-specific data)
    if (req.headers.authorization) {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cachedData = await cache.get(key);
      if (cachedData) {
        return res.json(cachedData);
      }
    } catch (error) {
      console.error('Cache middleware error:', error);
    }

    // Store original send function
    const originalSend = res.json;
    
    // Override send function to cache response
    res.json = function(data) {
      // Cache the response
      cache.set(key, data, duration).catch(console.error);
      
      // Call original send function
      return originalSend.call(this, data);
    };

    next();
  };
};

// Cache invalidation helpers
const invalidateCache = {
  // Invalidate product-related cache
  async products() {
    if (!client) return;
    await cache.delPattern('cache:/api/products*');
    await cache.delPattern('cache:/api/categories*');
  },

  // Invalidate user-related cache
  async users() {
    if (!client) return;
    await cache.delPattern('cache:/api/users*');
  },

  // Invalidate order-related cache
  async orders() {
    if (!client) return;
    await cache.delPattern('cache:/api/orders*');
  },

  // Invalidate all cache
  async all() {
    if (!client) return;
    await cache.clear();
  }
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  client
}; 