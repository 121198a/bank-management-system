const { body, param, query } = require('express-validator');
const { PERMISSIONS } = require('../models/EmployeeProfile');

const createEmployeeValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be between 8 and 72 characters'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is invalid'),

  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 250 })
    .withMessage('Address cannot exceed 250 characters'),

  body('branch')
    .notEmpty()
    .withMessage('Branch is required')
    .isMongoId()
    .withMessage('Invalid branch ID'),

  body('designation')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Designation must be between 2 and 100 characters'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),

  body('permissions.*')
    .optional()
    .isIn(PERMISSIONS)
    .withMessage('Invalid employee permission')
];

const listEmployeesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters'),

  query('branch')
    .optional()
    .isMongoId()
    .withMessage('Invalid branch ID'),

  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid status')
];

const updateEmployeeValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid employee ID'),

  body('branch')
    .optional()
    .isMongoId()
    .withMessage('Invalid branch ID'),

  body('designation')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Designation must be between 2 and 100 characters'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),

  body('permissions.*')
    .optional()
    .isIn(PERMISSIONS)
    .withMessage('Invalid employee permission'),

  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

const employeeIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid employee ID')
];

module.exports = {
  createEmployeeValidator,
  listEmployeesValidator,
  updateEmployeeValidator,
  employeeIdValidator
};