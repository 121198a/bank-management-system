const { body, param, query } = require('express-validator');

const createBranchValidator = [
  body('branchName')
    .trim()
    .notEmpty()
    .withMessage('Branch name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Branch name must be between 2 and 100 characters'),

  body('branchCode')
    .trim()
    .matches(/^\d{4}$/)
    .withMessage('Branch code must be exactly 4 digits'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Branch address is required')
    .isLength({ max: 250 })
    .withMessage('Address cannot exceed 250 characters'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),

  body('pincode')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('PIN code must be exactly 6 digits'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is too long'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid branch email')
    .isLength({ max: 150 })
    .withMessage('Email is too long'),

  body('manager')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid manager ID'),

  body('workingHours')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Working hours cannot exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid branch status')
];

const updateBranchValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid branch ID'),

  body('branchName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Branch name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Branch name must be between 2 and 100 characters'),

  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty')
    .isLength({ max: 250 })
    .withMessage('Address cannot exceed 250 characters'),

  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty'),

  body('state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty'),

  body('pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('PIN code must be exactly 6 digits'),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is too long'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid branch email'),

  body('manager')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid manager ID'),

  body('workingHours')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Working hours cannot exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid branch status')
];

const branchIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid branch ID')
];

const listBranchesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid branch status'),

  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City filter is too long'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters')
];

module.exports = {
  createBranchValidator,
  updateBranchValidator,
  branchIdValidator,
  listBranchesValidator
};
