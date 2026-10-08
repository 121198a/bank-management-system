const ApiError = require('../utils/ApiError');

const WINDOW_MS = 60 * 1000;

/**
 * Fixed-window, in-memory rate limiter.
 *
 * Every limiter instance owns its OWN bucket map. (A previous version shared one module-level
 * map keyed only by IP, so all limiters drained the same counter: ~12 ordinary API calls were
 * enough to make the first login attempt return 429.)
 *
 * Still per-process: with several instances you need a shared store (e.g. Redis).
 */
const createRateLimiter = ({ limit = 100, windowMs = WINDOW_MS, keyGenerator = (req) => req.ip, name = 'default', store = null } = {}) => {
  const buckets = new Map();
  let lastStoreErrorLog = 0;

  // Drop expired buckets so memory cannot grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (now >= bucket.resetAt) buckets.delete(key);
  }, Math.max(windowMs, 1000));
  sweep.unref();

  const memoryHit = (key) => {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return bucket;
  };

  const respond = (bucket, res, next) => {
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - bucket.count));
    if (bucket.count > limit) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)));
      return next(new ApiError(429, 'Too many requests. Please try again later.'));
    }
    return next();
  };

  return (req, res, next) => {
    const key = keyGenerator(req);

    // No shared store configured: fully synchronous in-memory path.
    if (!store) return respond(memoryHit(key), res, next);

    // Shared store (Redis). If it is unreachable, degrade to the per-process limiter rather
    // than failing open (no protection) or failing closed (outage for every user).
    return store.hit(name, key, windowMs).then(
      (bucket) => respond(bucket, res, next),
      (err) => {
        if (Date.now() - lastStoreErrorLog > 30000) {
          lastStoreErrorLog = Date.now();
          console.error(`Rate-limit store unavailable (${err.message}); using in-memory fallback`);
        }
        return respond(memoryHit(key), res, next);
      }
    );
  };
};

module.exports = createRateLimiter;
