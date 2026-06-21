const { body, param, query } = require('express-validator');

const createAccountValidator = [
  body('accountType')
    .notEmpty().withMessage('Account type is required')
    .isIn(['savings', 'current']).withMessage('Account type must be savings or current'),
  body('initialDeposit')
    .optional()
    .isFloat({ min: 0 }).withMessage('Initial deposit must be a positive number')
];

const accountIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid account ID')
];

const updateAccountStatusValidator = [
  param('id').isMongoId().withMessage('Invalid account ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'rejected', 'closed']).withMessage('Status must be active, rejected, or closed'),
  body('remarks').optional().trim().isLength({ max: 250 })
];

const listAccountsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'active', 'rejected', 'closed']).withMessage('Invalid status filter'),
  query('accountType').optional().isIn(['savings', 'current']).withMessage('Invalid account type filter'),
  query('search').optional().trim().isLength({ max: 100 })
];

module.exports = {
  createAccountValidator,
  accountIdParamValidator,
  updateAccountStatusValidator,
  listAccountsValidator
};
