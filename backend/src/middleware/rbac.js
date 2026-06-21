const ApiError = require('../utils/ApiError');

/**
 * Restricts access to the given roles. Must be used after `authenticate`.
 * Usage: router.get('/', authenticate, authorize('admin', 'employee'), controller)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. Required role(s): ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
};

module.exports = authorize;
