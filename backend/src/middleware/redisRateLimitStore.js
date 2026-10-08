/**
 * Redis-backed fixed-window counter shared by every API instance.
 * One atomic Lua call increments the counter and (on first hit) sets the window expiry,
 * so concurrent requests across instances cannot race past the limit.
 */
const SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { c, redis.call('PTTL', KEYS[1]) }
`;

const createRedisStore = (redis, { prefix = 'rl' } = {}) => ({
  async hit(name, key, windowMs) {
    const [count, ttl] = await redis.eval(SCRIPT, 1, `${prefix}:${name}:${key}`, windowMs);
    return { count: Number(count), resetAt: Date.now() + (Number(ttl) > 0 ? Number(ttl) : windowMs) };
  }
});

module.exports = createRedisStore;
