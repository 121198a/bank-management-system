const { body, param, query } = require('express-validator');

const createAccountValidator = [
  body('accountType')
    .notEmpty().withMessage('Account type is required')
    .isIn(['savings', 'current']).withMessage('Account type must be savings or current'),
  body('initialDeposit')
    .optional({ checkFalsy: true })
    .isDecimal({ decimal_digits: '0,2', force_decimal: false }).withMessage('Initial deposit must be a valid decimal with at most 2 decimal places')
    .custom((value) => Number(value) >= 0).withMessage('Initial deposit cannot be negative')
];

const accountIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid account ID')
];

const updateAccountStatusValidator = [
  param('id').isMongoId().withMessage('Invalid account ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'rejected', 'frozen', 'suspended', 'closed']).withMessage('Invalid account status'),
  body('remarks').optional().trim().isLength({ max: 250 })
];

const listAccountsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'active', 'rejected', 'frozen', 'suspended', 'closed']).withMessage('Invalid status filter'),
  query('accountType').optional().isIn(['savings', 'current']).withMessage('Invalid account type filter'),
  query('search').optional().trim().isLength({ max: 100 })
];

module.exports = {
  createAccountValidator,
  accountIdParamValidator,
  updateAccountStatusValidator,
  listAccountsValidator
};
