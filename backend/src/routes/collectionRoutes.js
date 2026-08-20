const express = require('express');

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const {
  createCaseValidator, assignCaseValidator, caseIdValidator, listCasesValidator,
  contactLogValidator, promiseToPayValidator, recordPaymentValidator, followUpValidator,
  escalateValidator, remarkValidator, closeCaseValidator
} = require('../validators/collectionValidators');

const {
  createCase, assignCase, listCases, getCaseById,
  addContactLog, recordPromiseToPay, recordPayment, markFollowUpRequired,
  escalateCase, addCaseRemark, closeCase
} = require('../controllers/collectionController');

const router = express.Router();

router.use(authenticate);

router.use(authorize('admin', 'employee'));

router.post('/cases', createCaseValidator, validate, createCase);
router.get('/cases', listCasesValidator, validate, listCases);
router.get('/cases/:id', caseIdValidator, validate, getCaseById);
router.put('/cases/:id/assign', caseIdValidator, assignCaseValidator, validate, assignCase);
router.put('/cases/:id/contact', caseIdValidator, contactLogValidator, validate, addContactLog);
router.put('/cases/:id/promise-to-pay', caseIdValidator, promiseToPayValidator, validate, recordPromiseToPay);
router.put('/cases/:id/payment', caseIdValidator, recordPaymentValidator, validate, recordPayment);
router.put('/cases/:id/follow-up', caseIdValidator, followUpValidator, validate, markFollowUpRequired);
router.put('/cases/:id/escalate', caseIdValidator, escalateValidator, validate, escalateCase);
router.put('/cases/:id/remark', caseIdValidator, remarkValidator, validate, addCaseRemark);
router.put('/cases/:id/close', caseIdValidator, closeCaseValidator, validate, closeCase);

module.exports = router;
