const ApiError = require('../utils/ApiError');
const EmployeeProfile = require('../models/EmployeeProfile');

/**
 * Role-based authorization.
 *
 * Must be used after authenticate middleware.
 *
 * Example:
 * router.get('/', authorize('admin', 'employee'), controller);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role(s): ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Permission-based authorization.
 *
 * Admins automatically have access.
 *
 * Employees must have all requested permissions
 * inside their EmployeeProfile.
 *
 * Example:
 * requirePermission('customer.view')
 */
const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      // Admin has full access.
      if (req.user.role === 'admin') {
        return next();
      }

      // Only employees use granular permissions.
      if (req.user.role !== 'employee') {
        return next(
          new ApiError(403, 'Permission denied')
        );
      }

      const userId = req.user._id || req.user.id;

      const employee = await EmployeeProfile.findOne({
        user: userId,
        status: 'active'
      }).select('permissions');

      if (!employee) {
        return next(
          new ApiError(403, 'Employee profile not found or inactive')
        );
      }

      const hasAllPermissions = requiredPermissions.every(
        (permission) => employee.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return next(
          new ApiError(
            403,
            `Permission denied. Required permission(s): ${requiredPermissions.join(', ')}`
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorize;
module.exports.requirePermission = requirePermission;