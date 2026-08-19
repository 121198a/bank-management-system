const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

/**
 * Generates a short-lived JWT access token containing user id and role.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion || 0 },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpires }
  );
};

/**
 * Generates a long-lived refresh token (random string signed as JWT for expiry tracking).
 */
const generateRefreshToken = (user) => {
  const tokenId = crypto.randomBytes(32).toString('hex');
  const token = jwt.sign(
    { id: user._id.toString(), tokenId },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpires }
  );
  return token;
};

const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);

const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

/**
 * Hashes a refresh token before persisting to the database (so leaked DB doesn't expose tokens).
 */
const hashToken = async (token) => {
  return bcrypt.hash(token, 10);
};

const compareToken = async (token, hash) => {
  if (!hash) return false;
  return bcrypt.compare(token, hash);
};

/**
 * Generates a secure random token for password reset, returns both raw and hashed versions.
 */
const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

const hashResetToken = (rawToken) => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  generateResetToken,
  hashResetToken
};
