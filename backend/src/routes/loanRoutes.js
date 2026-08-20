const express = require('express');

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { requirePermission } = authorize;
const validate = require('../middleware/validate');

const {
  createLoanValidator,
  listLoansValidator,
  loanIdValidator,
  documentIdValidator,
  requestDocumentsValidator,
  remarkValidator,
  recommendValidator,
  managerDecisionValidator,
  approveValidator,
  rejectValidator,
  attachDocumentsValidator
} = require('../validators/loanValidators');

const {
  createLoanApplication,
  getMyLoanApplications,
  getLoanApplicationById,
  listLoanApplications,
  startLoanReview,
  requestLoanDocuments,
  addLoanRemark,
  recommendLoanAmount,
  forwardLoanToManager,
  managerReviewLoan,
  attachLoanDocuments,
  uploadLoanDocument,
  downloadLoanDocument,
  verifyLoanDocument,
  approveLoanApplication,
  rejectLoanApplication,
  disburseLoan
} = require('../controllers/loanController');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('customer'), createLoanValidator, validate, createLoanApplication);
router.get('/my', authorize('customer'), listLoansValidator, validate, getMyLoanApplications);
router.put('/:id/documents', authorize('customer'), loanIdValidator, attachDocumentsValidator, validate, attachLoanDocuments);
router.post('/:id/documents/upload', authorize('customer'), loanIdValidator, express.raw({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), uploadLoanDocument);
router.get('/:id/documents/:documentId/file', loanIdValidator, documentIdValidator, validate, downloadLoanDocument);

router.get('/', authorize('admin', 'employee'), requirePermission('loan.review'), listLoansValidator, validate, listLoanApplications);
router.get('/:id', loanIdValidator, validate, getLoanApplicationById);

router.put('/:id/review', authorize('employee'), requirePermission('loan.review'), loanIdValidator, validate, startLoanReview);
router.put('/:id/documents-required', authorize('employee'), requirePermission('loan.review'), loanIdValidator, requestDocumentsValidator, validate, requestLoanDocuments);
router.put('/:id/remark', authorize('employee'), requirePermission('loan.review'), loanIdValidator, remarkValidator, validate, addLoanRemark);
router.put('/:id/recommend', authorize('employee'), requirePermission('loan.review'), loanIdValidator, recommendValidator, validate, recommendLoanAmount);
router.put('/:id/documents/:documentId/verify', authorize('employee'), requirePermission('loan.review'), loanIdValidator, documentIdValidator, validate, verifyLoanDocument);
router.put('/:id/forward-to-manager', authorize('employee'), requirePermission('loan.review'), loanIdValidator, validate, forwardLoanToManager);

router.put('/:id/manager-review', authorize('admin', 'employee'), requirePermission('loan.review'), loanIdValidator, managerDecisionValidator, validate, managerReviewLoan);

router.put('/:id/approve', authorize('admin', 'employee'), requirePermission('loan.approve'), loanIdValidator, approveValidator, validate, approveLoanApplication);
router.put('/:id/reject', authorize('admin', 'employee'), requirePermission('loan.review'), loanIdValidator, rejectValidator, validate, rejectLoanApplication);
router.put('/:id/disburse', authorize('admin'), loanIdValidator, validate, disburseLoan);

module.exports = router;
