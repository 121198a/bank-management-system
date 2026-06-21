const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { query } = require('express-validator');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], validate, listAuditLogs);

module.exports = router;
