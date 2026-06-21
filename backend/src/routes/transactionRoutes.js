const express = require('express');
const {
  deposit,
  withdraw,
  transfer,
  getAccountTransactions,
  listAllTransactions,
  downloadStatement
} = require('../controllers/transactionController');
const {
  depositValidator,
  withdrawValidator,
  transferValidator,
  accountIdParamValidator,
  listTransactionsValidator,
  statementValidator
} = require('../validators/transactionValidators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

router.post('/deposit', authorize('customer', 'employee', 'admin'), depositValidator, validate, deposit);
router.post('/withdraw', authorize('customer', 'employee', 'admin'), withdrawValidator, validate, withdraw);
router.post('/transfer', authorize('customer', 'employee', 'admin'), transferValidator, validate, transfer);

router.get(
  '/account/:accountId',
  accountIdParamValidator,
  listTransactionsValidator,
  validate,
  getAccountTransactions
);

router.get('/', authorize('admin', 'employee'), listTransactionsValidator, validate, listAllTransactions);

router.get(
  '/statement/:accountId/pdf',
  statementValidator,
  validate,
  downloadStatement
);

module.exports = router;
