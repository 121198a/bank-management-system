const express = require('express');
const { submitKyc, getMyKyc, listKycRequests, reviewKycRequest } = require('../controllers/kycController');
const { submitKycValidator, reviewKycValidator, listKycValidator } = require('../validators/kycValidators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.post('/submit', authorize('customer'), submitKycValidator, validate, submitKyc);
router.get('/my', authorize('customer'), getMyKyc);
router.get('/', authorize('admin', 'employee'), listKycValidator, validate, listKycRequests);
router.put('/:id/review', authorize('admin', 'employee'), reviewKycValidator, validate, reviewKycRequest);

module.exports = router;
