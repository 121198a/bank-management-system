const { body, param, query } = require('express-validator');

const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 250 }).withMessage('Address cannot exceed 250 characters'),
  body('currentPassword')
    .optional()
    .notEmpty().withMessage('Current password is required to change password'),
  body('newPassword')
    .optional()
    .isLength({ min: 12 }).withMessage('New password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('New password must contain at least one special character')
];

const userIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid user ID')
];

const createUserValidator = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .customSanitizer((v) => v.trim().toLowerCase()),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'employee', 'customer']).withMessage('Role must be admin, employee, or customer'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 250 }).withMessage('Address cannot exceed 250 characters')
];

const editUserValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .customSanitizer((v) => v.trim().toLowerCase()),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 250 }).withMessage('Address cannot exceed 250 characters')
];

const updateRoleValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'employee', 'customer']).withMessage('Role must be admin, employee, or customer')
];

const updateStatusValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('isActive')
    .notEmpty().withMessage('isActive is required')
    .isBoolean().withMessage('isActive must be a boolean')
];

const listUsersValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['admin', 'employee', 'customer']).withMessage('Invalid role filter'),
  query('kycStatus').optional().isIn(['pending', 'verified', 'rejected']).withMessage('Invalid KYC status filter'),
  query('search').optional().trim().isLength({ max: 100 })
];

module.exports = {
  updateProfileValidator,
  userIdParamValidator,
  createUserValidator,
  editUserValidator,
  updateRoleValidator,
  updateStatusValidator,
  listUsersValidator
};
