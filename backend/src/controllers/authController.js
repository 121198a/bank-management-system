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
const { logSecurityEvent, checkRepeatedFailedLogins } = require('../services/securityEventService');
const { generateYearScopedId } = require('../utils/sequence');
const env = require('../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';


const handleFailedLogin = async (email, req, userId = null) => {
  await logSecurityEvent({ type: 'LOGIN_FAILED', user: userId, email, req, severity: 'low' });
  try {
    const isSuspicious = await checkRepeatedFailedLogins(email);
    if (isSuspicious) {
      await logSecurityEvent({ type: 'SUSPICIOUS_LOGIN', user: userId, email, req, severity: 'high', metadata: { rule: 'repeated_failed_logins' } });
      const FraudAlert = require('../models/FraudAlert');
      const alertId = await generateYearScopedId('FRD');
      await FraudAlert.create({
        alertId,
        severity: 'high',
        reason: `5 or more failed login attempts for ${email} within 15 minutes`,
        rule: 'repeated_failed_logins',
        relatedUser: userId
      });
    }
  } catch (error) {
    console.error(`Failed-login escalation check failed: ${error.message}`);
  }
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: env.jwt.refreshExpiresMs,
  path: '/api/auth'
};


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

const login = asyncHandler(async (req, res) => {

  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');

  if (!user) {
    await handleFailedLogin(email, req);
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    await handleFailedLogin(email, req, user._id);
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await handleFailedLogin(email, req, user._id);
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

  await logSecurityEvent({ type: 'LOGIN_SUCCESS', user: user._id, email, req, severity: 'low' });

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
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

  return new ApiResponse(200, 'Logged out successfully').send(res);
});


const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

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
  user.tokenVersion += 1; // invalidate all existing access tokens
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
