const env = require('../config/env');
const createRateLimiterBase = require('./rateLimit');
const createRedisStore = require('./redisRateLimitStore');
const { getRedis } = require('../config/redis');

// One shared store (Redis when REDIS_URL is set, otherwise per-process memory) for all limiters.
const redis = getRedis();
const store = redis ? createRedisStore(redis) : null;

const createRateLimiter = (options) => createRateLimiterBase({ store, ...options });

/**
 * Per-user limiter for money movement. Must be mounted AFTER authenticate so req.user exists;
 * falls back to the IP only if (unexpectedly) no user is attached.
 */
const perUserTransactionLimiter = createRateLimiter({
  name: 'transactions-user',
  limit: env.rateLimit.transactionMax,
  keyGenerator: (req) => (req.user && req.user._id ? `user:${req.user._id}` : `ip:${req.ip}`)
});

module.exports = { createRateLimiter, perUserTransactionLimiter };
