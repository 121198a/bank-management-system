const { body, param, query } = require('express-validator');

const rejectUnknownBodyFields = (allowed) => body().custom((value, { req }) => {
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(', ')}`);
  return true;
});

const PRODUCT_TYPES = ['life', 'health', 'vehicle', 'property', 'travel'];
const POLICY_STATUSES = ['submitted', 'under_review', 'documents_required', 'manager_review', 'approved', 'rejected', 'active', 'lapsed', 'expired', 'cancelled'];
const CLAIM_STATUSES = ['submitted', 'under_review', 'manager_review', 'approved', 'rejected', 'settled', 'cancelled'];
const DOCUMENT_TYPES = ['identity_proof', 'address_proof', 'pan', 'income_proof', 'salary_slip', 'bank_statement', 'employment_proof', 'other'];

const decimalMoney = (field, label) => body(field)
  .notEmpty().withMessage(`${label} is required`)
  .isDecimal({ decimal_digits: '0,2', force_decimal: false }).withMessage(`${label} must be a valid decimal with at most 2 decimal places`)
  .custom((value) => Number(value) > 0).withMessage(`${label} must be greater than zero`);

const createProductValidator = [
  rejectUnknownBodyFields(['code', 'name', 'type', 'description', 'minSumInsured', 'maxSumInsured', 'annualPremiumRatePercent', 'minTermMonths', 'maxTermMonths']),
  body('code').trim().notEmpty().isLength({ max: 20 }).withMessage('code is required (max 20 chars)'),
  body('name').trim().notEmpty().isLength({ max: 120 }).withMessage('name is required'),
  body('type').isIn(PRODUCT_TYPES).withMessage(`type must be one of ${PRODUCT_TYPES.join(', ')}`),
  body('description').optional().trim().isLength({ max: 1000 }),
  decimalMoney('minSumInsured', 'minSumInsured'),
  decimalMoney('maxSumInsured', 'maxSumInsured'),
  body('annualPremiumRatePercent').isFloat({ min: 0.01, max: 100 }).withMessage('annualPremiumRatePercent must be between 0.01 and 100'),
  body('minTermMonths').isInt({ min: 1 }).withMessage('minTermMonths must be a positive integer'),
  body('maxTermMonths').isInt({ min: 1 }).withMessage('maxTermMonths must be a positive integer')
];

const updateProductStatusValidator = [
  rejectUnknownBodyFields(['status']),
  body('status').isIn(['active', 'inactive']).withMessage('status must be active or inactive')
];

const applyPolicyValidator = [
  rejectUnknownBodyFields(['productId', 'accountId', 'sumInsured', 'termMonths', 'premiumFrequency', 'nominee']),
  body('productId').isMongoId().withMessage('Valid productId is required'),
  body('accountId').isMongoId().withMessage('Valid accountId is required'),
  decimalMoney('sumInsured', 'sumInsured'),
  body('termMonths').isInt({ min: 1, max: 600 }).withMessage('termMonths must be a positive integer'),
  body('premiumFrequency').optional().isIn(['monthly', 'quarterly', 'annually']),
  body('nominee').optional().isObject(),
  body('nominee.name').optional().trim().isLength({ max: 120 }),
  body('nominee.relation').optional().trim().isLength({ max: 60 }),
  body('nominee.contactNumber').optional().trim().isLength({ max: 20 })
];

const listPoliciesValidator = [query('status').optional().isIn(POLICY_STATUSES)];
const policyIdValidator = [param('id').isMongoId().withMessage('Invalid policy id')];
const documentIdValidator = [param('documentId').isMongoId().withMessage('Invalid document id')];

const requestDocumentsValidator = [
  rejectUnknownBodyFields(['documentTypes']),
  body('documentTypes').isArray({ min: 1 }).withMessage('documentTypes must be a non-empty array'),
  body('documentTypes.*').isIn(DOCUMENT_TYPES).withMessage(`Each document type must be one of ${DOCUMENT_TYPES.join(', ')}`)
];

const remarkValidator = [
  rejectUnknownBodyFields(['text']),
  body('text').trim().notEmpty().isLength({ min: 2, max: 1000 }).withMessage('Remark text is required')
];

const managerDecisionValidator = [
  rejectUnknownBodyFields(['decision', 'reason']),
  body('decision').isIn(['forward', 'reject']).withMessage("decision must be 'forward' or 'reject'"),
  body('reason').if(body('decision').equals('reject')).trim().notEmpty().isLength({ min: 3, max: 1000 }).withMessage('Rejection reason is required')
];

const rejectValidator = [
  rejectUnknownBodyFields(['reason']),
  body('reason').trim().notEmpty().isLength({ min: 3, max: 1000 }).withMessage('Rejection reason is required')
];

const fileClaimValidator = [
  rejectUnknownBodyFields(['policyId', 'incidentDate', 'description', 'claimAmount']),
  body('policyId').isMongoId().withMessage('Valid policyId is required'),
  body('incidentDate').isISO8601().toDate().withMessage('Valid incidentDate is required')
    .custom((value) => value <= new Date()).withMessage('incidentDate cannot be in the future'),
  body('description').trim().notEmpty().isLength({ min: 10, max: 2000 }).withMessage('description must be 10-2000 characters'),
  decimalMoney('claimAmount', 'claimAmount')
];

const listClaimsValidator = [query('status').optional().isIn(CLAIM_STATUSES)];
const claimIdValidator = [param('id').isMongoId().withMessage('Invalid claim id')];

const approveClaimValidator = [
  rejectUnknownBodyFields(['approvedAmount']),
  body('approvedAmount').optional().isDecimal({ decimal_digits: '0,2', force_decimal: false })
    .custom((value) => Number(value) > 0).withMessage('approvedAmount must be greater than zero')
];

module.exports = {
  createProductValidator, updateProductStatusValidator,
  applyPolicyValidator, listPoliciesValidator, policyIdValidator, documentIdValidator,
  requestDocumentsValidator, remarkValidator, managerDecisionValidator, rejectValidator,
  fileClaimValidator, listClaimsValidator, claimIdValidator, approveClaimValidator
};
