const { body, param, query } = require('express-validator');

const rejectUnknownBodyFields = (allowed) => body().custom((value, { req }) => {
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(', ')}`);
  return true;
});

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const createIncidentValidator = [
  rejectUnknownBodyFields(['title', 'description', 'severity', 'relatedEventIds', 'assignedTo']),
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').trim().notEmpty().isLength({ min: 10, max: 2000 }),
  body('severity').optional().isIn(SEVERITIES),
  body('relatedEventIds').optional().isArray(),
  body('relatedEventIds.*').optional().isMongoId(),
  body('assignedTo').optional().isMongoId()
];

const resolveIncidentValidator = [
  rejectUnknownBodyFields(['status', 'resolution']),
  body('status').isIn(['resolved', 'false_positive']),
  body('resolution').trim().notEmpty().isLength({ min: 3, max: 1000 })
];

const reviewAlertValidator = [
  rejectUnknownBodyFields(['status', 'resolution']),
  body('status').isIn(['under_review', 'confirmed', 'false_positive', 'resolved']),
  body('resolution').optional().trim().isLength({ max: 1000 })
];

const idValidator = [param('id').isMongoId().withMessage('Invalid id')];
const listValidator = [query('status').optional().trim(), query('severity').optional().isIn(SEVERITIES)];

module.exports = { createIncidentValidator, resolveIncidentValidator, reviewAlertValidator, idValidator, listValidator };
