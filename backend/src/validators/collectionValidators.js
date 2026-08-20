const { body, param, query } = require('express-validator');

const rejectUnknownBodyFields = (allowed) => body().custom((value, { req }) => {
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(', ')}`);
  return true;
});

const CASE_STATUSES = ['assigned', 'contact_pending', 'customer_contacted', 'promise_to_pay', 'payment_received', 'follow_up_required', 'escalated', 'recovered', 'closed'];
const CONTACT_METHODS = ['call', 'email', 'sms', 'visit', 'other'];

const decimalMoney = (field, label) => body(field)
  .notEmpty().withMessage(`${label} is required`)
  .isDecimal({ decimal_digits: '0,2', force_decimal: false }).withMessage(`${label} must be a valid decimal`)
  .custom((value) => Number(value) > 0).withMessage(`${label} must be greater than zero`);

const createCaseValidator = [
  rejectUnknownBodyFields(['loanId', 'overdueAmount', 'dueSince', 'assignedEmployeeId', 'priority']),
  body('loanId').isMongoId().withMessage('Valid loanId is required'),
  decimalMoney('overdueAmount', 'overdueAmount'),
  body('dueSince').isISO8601().toDate().withMessage('Valid dueSince date is required'),
  body('assignedEmployeeId').optional().isMongoId(),
  body('priority').optional().isIn(['low', 'medium', 'high'])
];

const assignCaseValidator = [
  rejectUnknownBodyFields(['assignedEmployeeId']),
  body('assignedEmployeeId').isMongoId().withMessage('Valid assignedEmployeeId is required')
];

const caseIdValidator = [param('id').isMongoId().withMessage('Invalid case id')];
const listCasesValidator = [
  query('status').optional().isIn(CASE_STATUSES),
  query('priority').optional().isIn(['low', 'medium', 'high'])
];

const contactLogValidator = [
  rejectUnknownBodyFields(['method', 'outcome']),
  body('method').isIn(CONTACT_METHODS).withMessage(`method must be one of ${CONTACT_METHODS.join(', ')}`),
  body('outcome').trim().notEmpty().isLength({ min: 3, max: 500 }).withMessage('outcome is required')
];

const promiseToPayValidator = [
  rejectUnknownBodyFields(['amount', 'promisedDate']),
  decimalMoney('amount', 'amount'),
  body('promisedDate').isISO8601().toDate().withMessage('Valid promisedDate is required')
    .custom((value) => value >= new Date(new Date().toDateString())).withMessage('promisedDate cannot be in the past')
];

const recordPaymentValidator = [
  rejectUnknownBodyFields(['amount']),
  decimalMoney('amount', 'amount')
];

const followUpValidator = [
  rejectUnknownBodyFields(['text']),
  body('text').optional().trim().isLength({ max: 1000 })
];

const escalateValidator = [
  rejectUnknownBodyFields(['escalatedTo', 'reason']),
  body('escalatedTo').optional().isMongoId(),
  body('reason').trim().notEmpty().isLength({ min: 3, max: 1000 }).withMessage('reason is required')
];

const remarkValidator = [
  rejectUnknownBodyFields(['text']),
  body('text').trim().notEmpty().isLength({ min: 2, max: 1000 }).withMessage('Remark text is required')
];

const closeCaseValidator = [
  rejectUnknownBodyFields(['reason']),
  body('reason').trim().notEmpty().isLength({ min: 3, max: 1000 }).withMessage('reason is required')
];

module.exports = {
  createCaseValidator, assignCaseValidator, caseIdValidator, listCasesValidator,
  contactLogValidator, promiseToPayValidator, recordPaymentValidator, followUpValidator,
  escalateValidator, remarkValidator, closeCaseValidator
};
