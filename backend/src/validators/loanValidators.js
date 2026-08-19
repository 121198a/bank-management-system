const { body, param, query } = require('express-validator');

const rejectUnknownBodyFields = (allowed) => body().custom((value, { req }) => {
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(', ')}`);
  return true;
});

const LOAN_TYPES = ['personal', 'home', 'education', 'vehicle', 'business'];
const LOAN_STATUSES = ['draft', 'submitted', 'under_review', 'documents_required', 'approved', 'rejected', 'disbursed', 'cancelled'];
const DOCUMENT_TYPES = ['identity_proof', 'address_proof', 'pan', 'income_proof', 'salary_slip', 'bank_statement', 'employment_proof', 'other'];

const decimalMoney = (field, label, { allowZero = false } = {}) => {
  const chain = body(field)
    .notEmpty().withMessage(`${label} is required`)
    .isDecimal({ decimal_digits: '0,2', force_decimal: false }).withMessage(`${label} must be a valid decimal with at most 2 decimal places`);
  return allowZero
    ? chain.custom((value) => Number(value) >= 0).withMessage(`${label} cannot be negative`)
    : chain.custom((value) => Number(value) > 0).withMessage(`${label} must be greater than zero`);
};

const createLoanValidator = [
  rejectUnknownBodyFields(['accountId', 'employmentType', 'employerName', 'designation', 'monthlyIncome', 'workExperienceYears', 'loanType', 'requestedAmount', 'tenureMonths', 'purpose', 'existingEmi', 'hasExistingLoans']),
  body('accountId').isMongoId().withMessage('Invalid account ID'),
  body('employmentType').isIn(['salaried', 'self_employed', 'business_owner', 'unemployed', 'other']).withMessage('Invalid employment type'),
  body('employerName').optional().trim().isLength({ max: 150 }).withMessage('Employer name is too long'),
  body('designation').optional().trim().isLength({ max: 120 }).withMessage('Designation is too long'),
  decimalMoney('monthlyIncome', 'Monthly income', { allowZero: true }),
  body('workExperienceYears').optional().isFloat({ min: 0, max: 80 }).withMessage('Work experience must be between 0 and 80 years'),
  body('loanType').isIn(LOAN_TYPES).withMessage('Invalid loan type'),
  decimalMoney('requestedAmount', 'Requested amount'),
  body('tenureMonths').isInt({ min: 3, max: 360 }).withMessage('Tenure must be between 3 and 360 months'),
  body('purpose').trim().notEmpty().isLength({ max: 500 }).withMessage('Purpose is required and must be at most 500 characters'),
  decimalMoney('existingEmi', 'Existing EMI', { allowZero: true }).optional({ checkFalsy: true }),
  body('hasExistingLoans').isBoolean().withMessage('hasExistingLoans must be true or false')
];

const loanIdValidator = [
  param('id').isMongoId().withMessage('Invalid loan application ID')
];

const documentIdValidator = [
  param('documentId').isMongoId().withMessage('Invalid document ID')
];

const listLoansValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(LOAN_STATUSES).withMessage('Invalid status filter'),
  query('loanType').optional().isIn(LOAN_TYPES).withMessage('Invalid loan type filter'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search is too long')
];

const requestDocumentsValidator = [
  rejectUnknownBodyFields(['documentTypes']),
  body('documentTypes').isArray({ min: 1, max: DOCUMENT_TYPES.length }).withMessage('At least one document type is required'),
  body('documentTypes.*').isIn(DOCUMENT_TYPES).withMessage('Invalid document type')
];

const remarkValidator = [
  rejectUnknownBodyFields(['text']),
  body('text').trim().notEmpty().isLength({ min: 2, max: 1000 }).withMessage('Remark must be between 2 and 1000 characters')
];

const recommendValidator = [
  rejectUnknownBodyFields(['amount']),
  decimalMoney('amount', 'Recommended amount')
];

const approveValidator = [
  rejectUnknownBodyFields(['approvedAmount']),
  body('approvedAmount')
    .optional()
    .isDecimal({ decimal_digits: '0,2', force_decimal: false }).withMessage('Approved amount must be a valid decimal')
    .custom((value) => Number(value) > 0).withMessage('Approved amount must be greater than zero')
];

const rejectValidator = [
  rejectUnknownBodyFields(['reason']),
  body('reason').trim().notEmpty().isLength({ min: 3, max: 1000 }).withMessage('Rejection reason is required')
];

const attachDocumentsValidator = [
  rejectUnknownBodyFields(['documentIds']),
  body('documentIds').isArray({ min: 1, max: 20 }).withMessage('At least one document ID is required'),
  body('documentIds.*').isMongoId().withMessage('Invalid document ID')
];

module.exports = {
  createLoanValidator,
  listLoansValidator,
  loanIdValidator,
  documentIdValidator,
  requestDocumentsValidator,
  remarkValidator,
  recommendValidator,
  approveValidator,
  rejectValidator,
  attachDocumentsValidator
};
