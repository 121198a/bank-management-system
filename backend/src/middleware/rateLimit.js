const ApiError = require('../utils/ApiError');

const buckets = new Map();
const WINDOW_MS = 60 * 1000;

const createRateLimiter = ({ limit = 100, windowMs = WINDOW_MS, keyGenerator = (req) => req.ip } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const current = buckets.get(key);

    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', limit - 1);
      return next();
    }

    current.count += 1;
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current.count));
    res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));

    if (current.count > limit) {
      return next(new ApiError(429, 'Too many requests. Please try again later.'));
    }
    return next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = createRateLimiter;
