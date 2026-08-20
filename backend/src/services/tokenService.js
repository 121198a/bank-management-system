const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');


const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion || 0 },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpires }
  );
};


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


const hashToken = async (token) => {
  return bcrypt.hash(token, 10);
};

const compareToken = async (token, hash) => {
  if (!hash) return false;
  return bcrypt.compare(token, hash);
};


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
