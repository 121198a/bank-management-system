const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const {
  createLeadValidator, assignLeadValidator, leadIdValidator, listLeadsValidator,
  updateStatusValidator, remarkValidator, convertValidator
} = require('../validators/salesValidators');

const { createLead, assignLead, listLeads, getLeadById, updateLeadStatus, addLeadRemark, convertLead, getPerformance } = require('../controllers/salesController');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin', 'employee'));

router.post('/leads', createLeadValidator, validate, createLead);
router.get('/leads', listLeadsValidator, validate, listLeads);
router.get('/performance', getPerformance);
router.get('/leads/:id', leadIdValidator, validate, getLeadById);
router.put('/leads/:id/assign', leadIdValidator, assignLeadValidator, validate, assignLead);
router.put('/leads/:id/status', leadIdValidator, updateStatusValidator, validate, updateLeadStatus);
router.put('/leads/:id/remark', leadIdValidator, remarkValidator, validate, addLeadRemark);
router.put('/leads/:id/convert', leadIdValidator, convertValidator, validate, convertLead);

module.exports = router;
