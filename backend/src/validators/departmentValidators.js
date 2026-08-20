const { body, param, query } = require('express-validator');

const rejectUnknownBodyFields = (allowed) => body().custom((value, { req }) => {
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(', ')}`);
  return true;
});

const idValidator = [param('id').isMongoId().withMessage('Invalid department id')];
const listValidator = [query('status').optional().isIn(['active', 'inactive'])];

const updateValidator = [
  rejectUnknownBodyFields(['name', 'description', 'status', 'head']),
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('status').optional().isIn(['active', 'inactive']),
  body('head').optional({ nullable: true }).isMongoId()
];

module.exports = { idValidator, listValidator, updateValidator };
