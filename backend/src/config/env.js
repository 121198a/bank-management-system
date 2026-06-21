require('dotenv').config();

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;

  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // MongoDB
  mongoUri: required(
    'MONGO_URI',
    'mongodb://127.0.0.1:27017/banking_app'
  ),

  // JWT Configuration
  jwt: {
    accessSecret: required(
      'JWT_ACCESS_SECRET',
      'bank_management_access_secret_2026'
    ),

    refreshSecret: required(
      'JWT_REFRESH_SECRET',
      'bank_management_refresh_secret_2026'
    ),

    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',

    refreshExpiresMs: Number(
      process.env.JWT_REFRESH_EXPIRES_MS || 604800000
    )
  },

  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',

    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',

    from:
      process.env.SMTP_FROM ||
      'Bank Management System <no-reply@digitalbank.com>'
  },

  // Password Reset
  resetPasswordExpiresMs: Number(
    process.env.RESET_PASSWORD_EXPIRES_MS || 3600000
  )
};