const express = require('express');
const {
  createAccount,
  getMyAccounts,
  listAccounts,
  getAccountById,
  approveAccount,
  updateAccountStatus
} = require('../controllers/accountController');
const {
  createAccountValidator,
  accountIdParamValidator,
  updateAccountStatusValidator,
  listAccountsValidator
} = require('../validators/accountValidators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('customer'), createAccountValidator, validate, createAccount);
router.get('/my', authorize('customer'), getMyAccounts);

router.get('/', authorize('admin', 'employee'), listAccountsValidator, validate, listAccounts);
router.get('/:id', accountIdParamValidator, validate, getAccountById);

router.put('/:id/approve', authorize('admin', 'employee'), accountIdParamValidator, validate, approveAccount);
router.put('/:id/status', authorize('admin'), updateAccountStatusValidator, validate, updateAccountStatus);

module.exports = router;
