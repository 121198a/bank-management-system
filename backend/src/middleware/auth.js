const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');


const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired');
    }
    throw new ApiError(401, 'Invalid access token');
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, 'User belonging to this token no longer exists');
  }

  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion || 0)) {
    throw new ApiError(401, 'Session has been revoked. Please log in again.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact support.');
  }

  req.user = user;
  next();
});

module.exports = authenticate;
