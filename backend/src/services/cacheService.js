const Redis = require('ioredis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 60;

let redisClient = null;
let isRedisAvailable = false;

try {
  const connectionUrl = process.env.KV_URL || process.env.REDIS_URL;
  const redisConfig = connectionUrl
    ? connectionUrl
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy(times) {
          // Reconnect with exponential backoff capped at 5 seconds
          return Math.min(times * 500, 5000);
        },
      };

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('✅ Redis client connected successfully');
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
  });

  redisClient.on('error', (err) => {
    // Graceful degradation: suppress unhandled error crashes when Redis is offline
    isRedisAvailable = false;
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`⚠️  Redis warning: ${err.message}. Operating in direct-database fallback mode.`);
    }
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });
} catch (error) {
  console.warn(`⚠️  Failed to initialize Redis client: ${error.message}. Fallback mode active.`);
  isRedisAvailable = false;
}

/**
 * Get a value from Redis cache
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function get(key) {
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`Redis GET error for key [${key}]: ${err.message}`);
    return null;
  }
}

/**
 * Set a value in Redis cache with TTL
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=DEFAULT_TTL]
 * @returns {Promise<boolean>}
 */
async function set(key, value, ttlSeconds = DEFAULT_TTL) {
  if (!isRedisAvailable || !redisClient) return false;
  try {
    const serialized = JSON.stringify(value);
    await redisClient.set(key, serialized, 'EX', ttlSeconds);
    return true;
  } catch (err) {
    console.warn(`Redis SET error for key [${key}]: ${err.message}`);
    return false;
  }
}

/**
 * Delete a specific key
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function del(key) {
  if (!isRedisAvailable || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn(`Redis DEL error for key [${key}]: ${err.message}`);
    return false;
  }
}

/**
 * Cache-aside wrapper: reads from cache if present; otherwise runs fetchFn and caches result.
 * Gracefully degrades to running fetchFn() if Redis is offline.
 *
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - Expiration time in seconds
 * @param {Function} fetchFn - Async function to fetch data on miss
 * @returns {Promise<any>}
 */
async function getOrSet(key, ttlSeconds, fetchFn) {
  if (isRedisAvailable && redisClient) {
    try {
      const cached = await get(key);
      if (cached !== null && cached !== undefined) {
        return { data: cached, fromCache: true };
      }
    } catch (err) {
      console.warn(`Cache read bypassed for [${key}]: ${err.message}`);
    }
  }

  // Execute underlying database query
  const freshData = await fetchFn();

  // Cache the fresh data asynchronously without blocking response
  if (isRedisAvailable && redisClient && freshData !== undefined) {
    set(key, freshData, ttlSeconds).catch((err) => {
      console.warn(`Background cache write failed for [${key}]: ${err.message}`);
    });
  }

  return { data: freshData, fromCache: false };
}

/**
 * Invalidate all analytics caches (called when new logs are ingested)
 * @returns {Promise<number>} Number of keys deleted
 */
async function invalidateAnalyticsCaches() {
  if (!isRedisAvailable || !redisClient) return 0;
  try {
    // Scan for keys starting with 'analytics:'
    let cursor = '0';
    let totalDeleted = 0;
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', 'analytics:*', 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    return totalDeleted;
  } catch (err) {
    console.warn(`Error during analytics cache invalidation: ${err.message}`);
    return 0;
  }
}

/**
 * Check if Redis is healthy
 * @returns {{ connected: boolean, isAvailable: boolean }}
 */
function isHealthy() {
  return {
    connected: isRedisAvailable,
    status: isRedisAvailable ? 'connected' : 'disconnected',
  };
}

/**
 * Wait until Redis is ready or timeout
 * @param {number} [timeoutMs=2000]
 * @returns {Promise<boolean>}
 */
async function waitUntilReady(timeoutMs = 2000) {
  if (isRedisAvailable && redisClient?.status === 'ready') return true;
  if (!redisClient) return false;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const onReady = () => {
      clearTimeout(timer);
      resolve(true);
    };
    if (redisClient.status === 'ready') {
      clearTimeout(timer);
      resolve(true);
    } else {
      redisClient.once('ready', onReady);
    }
  });
}

/**
 * Close Redis connection cleanly
 */
async function close() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (e) {}
    isRedisAvailable = false;
  }
}

module.exports = {
  get,
  set,
  del,
  getOrSet,
  invalidateAnalyticsCaches,
  isHealthy,
  waitUntilReady,
  close,
  client: redisClient,
};

