const { body, param, query } = require('express-validator');

const depositValidator = [
  body('accountId').isMongoId().withMessage('Invalid account ID'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('description').optional().trim().isLength({ max: 250 })
];

const withdrawValidator = [
  body('accountId').isMongoId().withMessage('Invalid account ID'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('description').optional().trim().isLength({ max: 250 })
];

const transferValidator = [
  body('fromAccountId').isMongoId().withMessage('Invalid source account ID'),
  body('toAccountNumber')
    .notEmpty().withMessage('Recipient account number is required')
    .trim()
    .isLength({ min: 10, max: 10 }).withMessage('Account number must be 10 digits'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('description').optional().trim().isLength({ max: 250 })
];

const accountIdParamValidator = [
  param('accountId').isMongoId().withMessage('Invalid account ID')
];

const listTransactionsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['deposit', 'withdraw', 'transfer_in', 'transfer_out'])
    .withMessage('Invalid transaction type filter'),
  query('status').optional().isIn(['success', 'failed']).withMessage('Invalid status filter'),
  query('from').optional().isISO8601().withMessage('From date must be a valid ISO8601 date'),
  query('to').optional().isISO8601().withMessage('To date must be a valid ISO8601 date'),
  query('search').optional().trim().isLength({ max: 100 })
];

const statementValidator = [
  param('accountId').isMongoId().withMessage('Invalid account ID'),
  query('from').optional().isISO8601().withMessage('From date must be a valid ISO8601 date'),
  query('to').optional().isISO8601().withMessage('To date must be a valid ISO8601 date')
];

module.exports = {
  depositValidator,
  withdrawValidator,
  transferValidator,
  accountIdParamValidator,
  listTransactionsValidator,
  statementValidator
};
