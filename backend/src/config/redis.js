const Redis = require('ioredis');
const env = require('./env');

let client = null;

/**
 * Lazily creates the shared Redis client (only when REDIS_URL is configured).
 * Fails fast on every command (no offline queue, 1 retry) so a Redis outage degrades the
 * rate limiter to its in-memory fallback instead of making API requests hang.
 */
const getRedis = () => {
  if (!env.redisUrl) return null;
  if (!client) {
    client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      commandTimeout: 1000,
      retryStrategy: (attempt) => Math.min(attempt * 200, 5000)
    });
    client.on('error', () => { /* surfaced per-command by the limiter; avoid unhandled 'error' events */ });
  }
  return client;
};

const closeRedis = async () => {
  if (!client) return;
  const c = client;
  client = null;
  try { await c.quit(); } catch { c.disconnect(); }
};

module.exports = { getRedis, closeRedis };
