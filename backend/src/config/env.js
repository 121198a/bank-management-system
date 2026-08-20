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

module.exports = {
  port,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  clientOrigins,
  mongoUri,
  requireReplicaSet: process.env.REQUIRE_REPLICA_SET !== 'false',
  trustProxy: process.env.TRUST_PROXY === 'true',
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
    from: process.env.SMTP_FROM || 'Bank Management System <no-reply@digitalbank.com>'
  },
  resetPasswordExpiresMs: Number(process.env.RESET_PASSWORD_EXPIRES_MS || 3600000),
  adminSeed: {
    email: process.env.ADMIN_SEED_EMAIL || '',
    password: process.env.ADMIN_SEED_PASSWORD || '',
    fullName: process.env.ADMIN_SEED_FULL_NAME || 'Abhishek Kumar Sharma' 
  }
};
