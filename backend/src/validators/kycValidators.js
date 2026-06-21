const { body, param, query } = require('express-validator');

const submitKycValidator = [
  body('documentType')
    .notEmpty().withMessage('Document type is required')
    .isIn(['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id'])
    .withMessage('Invalid document type'),
  body('documentNumber')
    .notEmpty().withMessage('Document number is required')
    .trim()
    .isLength({ min: 5, max: 50 }).withMessage('Document number must be between 5 and 50 characters'),
  body('documentUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Document URL must be a valid URL')
];

const reviewKycValidator = [
  param('id').isMongoId().withMessage('Invalid KYC request ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters')
];

const listKycValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status filter'),
  query('search').optional().trim().isLength({ max: 100 })
];

module.exports = {
  submitKycValidator,
  reviewKycValidator,
  listKycValidator
};
