const brand = require('./brand');
require('dotenv').config();

const required = (key) => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

const clientOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map((value) => value.trim()).filter(Boolean);

const accessSecret = required('JWT_ACCESS_SECRET');
const refreshSecret = required('JWT_REFRESH_SECRET');
if (accessSecret === refreshSecret) throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
if (accessSecret.length < 32 || refreshSecret.length < 32) {
  throw new Error('JWT secrets must be at least 32 characters long');
}

const mongoUri = required('MONGO_URI');

// TRUST_PROXY: unset/false = trust nobody; "true" = trust every hop (client can forge X-Forwarded-For
// when more than one proxy sits in front); a number N = trust exactly N proxy hops (recommended).
const parseTrustProxy = (raw) => {
  if (raw === undefined || raw === '' || raw === 'false') return false;
  if (raw === 'true') return true;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 10) return n;
  throw new Error('TRUST_PROXY must be true, false, or a hop count between 1 and 10');
};

const positiveInt = (key, fallback) => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${key} must be a positive integer`);
  return n;
};

module.exports = {
  port,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  clientOrigins,
  mongoUri,
  requireReplicaSet: process.env.REQUIRE_REPLICA_SET !== 'false',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  redisUrl: process.env.REDIS_URL || '',
  rateLimit: {
    globalMax: positiveInt('RATE_LIMIT_GLOBAL_MAX', 120),
    authMax: positiveInt('RATE_LIMIT_AUTH_MAX', 10),
    transactionMax: positiveInt('RATE_LIMIT_TRANSACTION_MAX', 30)
  },
  jwt: {
    accessSecret,
    refreshSecret,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
    refreshExpiresMs: Number(process.env.JWT_REFRESH_EXPIRES_MS || 604800000)
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || `${brand.name} <no-reply@example.com>`
  },
  resetPasswordExpiresMs: Number(process.env.RESET_PASSWORD_EXPIRES_MS || 3600000),
  adminSeed: {
    email: process.env.ADMIN_SEED_EMAIL || '',
    password: process.env.ADMIN_SEED_PASSWORD || '',
    fullName: process.env.ADMIN_SEED_FULL_NAME || 'System Administrator'
  }
};
