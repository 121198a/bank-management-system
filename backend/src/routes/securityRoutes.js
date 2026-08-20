const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createIncidentValidator, resolveIncidentValidator, reviewAlertValidator, idValidator, listValidator } = require('../validators/securityValidators');
const { listSecurityEvents, createIncident, listIncidents, resolveIncident, listFraudAlerts, reviewFraudAlert } = require('../controllers/securityController');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin', 'employee'));

router.get('/events', listValidator, validate, listSecurityEvents);
router.post('/incidents', createIncidentValidator, validate, createIncident);
router.get('/incidents', listValidator, validate, listIncidents);
router.put('/incidents/:id/resolve', idValidator, resolveIncidentValidator, validate, resolveIncident);
router.get('/fraud-alerts', listValidator, validate, listFraudAlerts);
router.put('/fraud-alerts/:id/review', idValidator, reviewAlertValidator, validate, reviewFraudAlert);

module.exports = router;
