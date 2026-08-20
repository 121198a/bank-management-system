const { body, param, query } = require('express-validator');

const rejectUnknownBodyFields = (allowed) => body().custom((value, { req }) => {
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(', ')}`);
  return true;
});

const PRODUCT_INTERESTS = ['account', 'loan', 'insurance', 'card', 'fixed_deposit', 'other'];
const LEAD_STATUSES = ['new', 'assigned', 'contacted', 'interested', 'documents_required', 'application_started', 'converted', 'lost', 'closed'];

const createLeadValidator = [
  rejectUnknownBodyFields(['fullName', 'email', 'phone', 'productInterest', 'source']),
  body('fullName').trim().notEmpty().isLength({ max: 120 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').trim().notEmpty().isLength({ min: 6, max: 20 }),
  body('productInterest').isIn(PRODUCT_INTERESTS),
  body('source').optional().isIn(['walk_in', 'referral', 'call_center', 'online', 'campaign', 'other'])
];

const assignLeadValidator = [rejectUnknownBodyFields(['assignedEmployeeId']), body('assignedEmployeeId').isMongoId()];
const leadIdValidator = [param('id').isMongoId().withMessage('Invalid lead id')];
const listLeadsValidator = [query('status').optional().isIn(LEAD_STATUSES)];

const updateStatusValidator = [
  rejectUnknownBodyFields(['status', 'lostReason', 'text']),
  body('status').isIn(LEAD_STATUSES),
  body('lostReason').optional().trim().isLength({ max: 500 }),
  body('text').optional().trim().isLength({ max: 1000 })
];

const remarkValidator = [rejectUnknownBodyFields(['text']), body('text').trim().notEmpty().isLength({ min: 2, max: 1000 })];

const convertValidator = [
  rejectUnknownBodyFields(['convertedType', 'referenceId', 'customerId']),
  body('convertedType').isIn(['account', 'loan', 'insurance', 'card', 'fixed_deposit']),
  body('referenceId').isMongoId().withMessage('Valid referenceId is required'),
  body('customerId').optional().isMongoId()
];

module.exports = { createLeadValidator, assignLeadValidator, leadIdValidator, listLeadsValidator, updateStatusValidator, remarkValidator, convertValidator };
