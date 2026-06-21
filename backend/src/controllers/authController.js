const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  generateResetToken,
  hashResetToken
} = require('../services/tokenService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { writeAuditLog } = require('../middleware/auditLogger');
const env = require('../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: env.jwt.refreshExpiresMs,
  path: '/api/auth'
};

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, address } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName,
    email,
    passwordHash,
    phone: phone || '',
    address: address || '',
    role: 'customer'
  });

  await Notification.create({
    user: user._id,
    title: 'Welcome to Bank Management System',
    message: `Hi ${fullName}, your account has been created successfully. Open a bank account to get started.`,
    type: 'success'
  });

  await writeAuditLog({
    actor: user,
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user._id,
    after: user.toSafeObject(),
    req
  });

  return new ApiResponse(201, 'Registration successful', { user: user.toSafeObject() }).send(res);
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  // Defensive normalization: even though the validator already lowercases/trims,
  // we repeat it here so this function is correct in isolation (e.g. if called
  // from a script or test that bypasses the validator middleware).
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');

  if (!user) {
    if (env.nodeEnv !== 'production') {
      console.warn(`[login] No user found for email: "${email}"`);
    }
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact support.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    if (env.nodeEnv !== 'production') {
      console.warn(`[login] Password mismatch for email: "${email}"`);
    }
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

  await writeAuditLog({
    actor: user,
    action: 'USER_LOGIN',
    targetType: 'User',
    targetId: user._id,
    req
  });

  return new ApiResponse(200, 'Login successful', {
    user: user.toSafeObject(),
    accessToken
  }).send(res);
});

/**
 * POST /api/auth/refresh
 * Rotates the refresh token: validates the incoming token, issues new access + refresh tokens,
 * and invalidates the old refresh token.
 */
const refresh = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!incomingToken) {
    throw new ApiError(401, 'Refresh token missing. Please log in again.');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingToken);
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    throw new ApiError(401, 'Invalid or expired refresh token. Please log in again.');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');

  if (!user || !user.refreshTokenHash) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    throw new ApiError(401, 'Session not found. Please log in again.');
  }

  const isValid = await compareToken(incomingToken, user.refreshTokenHash);

  if (!isValid) {
    // Possible token reuse/theft - invalidate the session entirely
    user.refreshTokenHash = null;
    await user.save();
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    throw new ApiError(401, 'Refresh token reuse detected. Please log in again.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact support.');
  }

  // Rotate tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshTokenHash = await hashToken(newRefreshToken);
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);

  return new ApiResponse(200, 'Token refreshed successfully', {
    accessToken: newAccessToken,
    user: user.toSafeObject()
  }).send(res);
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (incomingToken) {
    try {
      const decoded = verifyRefreshToken(incomingToken);
      const user = await User.findById(decoded.id).select('+refreshTokenHash');
      if (user) {
        user.refreshTokenHash = null;
        await user.save();
      }
    } catch (err) {
      // Token already invalid - nothing to clean up
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

  return new ApiResponse(200, 'Logged out successfully').send(res);
});

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always respond with success to avoid leaking which emails are registered
  const genericResponse = new ApiResponse(
    200,
    'If an account with that email exists, a password reset link has been sent.'
  );

  if (!user) {
    return genericResponse.send(res);
  }

  const { rawToken, hashedToken } = generateResetToken();

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + env.resetPasswordExpiresMs);
  await user.save();

  const resetUrl = `${env.clientUrl}/reset-password/${rawToken}`;

  await sendPasswordResetEmail(user.email, resetUrl);

  await writeAuditLog({
    actor: user,
    action: 'PASSWORD_RESET_REQUESTED',
    targetType: 'User',
    targetId: user._id,
    req
  });

  return genericResponse.send(res);
});

/**
 * POST /api/auth/reset-password/:token
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = hashResetToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  }).select('+resetPasswordToken +resetPasswordExpires +refreshTokenHash');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired password reset token');
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.refreshTokenHash = null; // invalidate existing sessions
  await user.save();

  await Notification.create({
    user: user._id,
    title: 'Password Changed',
    message: 'Your password was reset successfully. If you did not do this, contact support immediately.',
    type: 'warning'
  });

  await writeAuditLog({
    actor: user,
    action: 'PASSWORD_RESET_COMPLETED',
    targetType: 'User',
    targetId: user._id,
    req
  });

  return new ApiResponse(200, 'Password reset successful. Please log in with your new password.').send(res);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions
};
