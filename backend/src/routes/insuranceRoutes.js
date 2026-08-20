const express = require('express');

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { requirePermission } = authorize;
const validate = require('../middleware/validate');

const {
  createProductValidator,
  updateProductStatusValidator,
  applyPolicyValidator,
  listPoliciesValidator,
  policyIdValidator,
  documentIdValidator,
  requestDocumentsValidator,
  remarkValidator,
  managerDecisionValidator,
  rejectValidator,
  fileClaimValidator,
  listClaimsValidator,
  claimIdValidator,
  approveClaimValidator
} = require('../validators/insuranceValidators');

const {
  createProduct, listProducts, updateProductStatus,
  applyForPolicy, getMyPolicies, getPolicyById, listPolicies,
  startPolicyReview, requestPolicyDocuments, addPolicyRemark, forwardPolicyToManager, managerReviewPolicy, approvePolicy, rejectPolicy,
  uploadPolicyDocument, downloadPolicyDocument, verifyPolicyDocument,
  fileClaim, getMyClaims, listClaims, getClaimById, startClaimReview, forwardClaimToManager, managerReviewClaim, approveClaim, rejectClaim, settleClaim
} = require('../controllers/insuranceController');

const router = express.Router();

router.use(authenticate);

router.post('/products', authorize('admin'), createProductValidator, validate, createProduct);
router.get('/products', listProducts);
router.put('/products/:id/status', authorize('admin'), updateProductStatusValidator, validate, updateProductStatus);

router.post('/policies', authorize('customer'), applyPolicyValidator, validate, applyForPolicy);
router.get('/policies/my', authorize('customer'), listPoliciesValidator, validate, getMyPolicies);
router.post('/policies/:id/documents/upload', authorize('customer'), policyIdValidator, express.raw({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), uploadPolicyDocument);
router.get('/policies/:id/documents/:documentId/file', policyIdValidator, documentIdValidator, validate, downloadPolicyDocument);

router.get('/policies', authorize('admin', 'employee'), requirePermission('insurance.review'), listPoliciesValidator, validate, listPolicies);
router.get('/policies/:id', policyIdValidator, validate, getPolicyById);
router.put('/policies/:id/review', authorize('employee'), requirePermission('insurance.review'), policyIdValidator, validate, startPolicyReview);
router.put('/policies/:id/documents-required', authorize('employee'), requirePermission('insurance.review'), policyIdValidator, requestDocumentsValidator, validate, requestPolicyDocuments);
router.put('/policies/:id/remark', authorize('employee'), requirePermission('insurance.review'), policyIdValidator, remarkValidator, validate, addPolicyRemark);
router.put('/policies/:id/documents/:documentId/verify', authorize('employee'), requirePermission('insurance.review'), policyIdValidator, documentIdValidator, validate, verifyPolicyDocument);
router.put('/policies/:id/forward-to-manager', authorize('employee'), requirePermission('insurance.review'), policyIdValidator, validate, forwardPolicyToManager);
router.put('/policies/:id/manager-review', authorize('admin', 'employee'), requirePermission('insurance.review'), policyIdValidator, managerDecisionValidator, validate, managerReviewPolicy);
router.put('/policies/:id/approve', authorize('admin', 'employee'), requirePermission('insurance.approve'), policyIdValidator, validate, approvePolicy);
router.put('/policies/:id/reject', authorize('admin', 'employee'), requirePermission('insurance.review'), policyIdValidator, rejectValidator, validate, rejectPolicy);

router.post('/claims', authorize('customer'), fileClaimValidator, validate, fileClaim);
router.get('/claims/my', authorize('customer'), listClaimsValidator, validate, getMyClaims);
router.get('/claims', authorize('admin', 'employee'), requirePermission('insurance.claim.review'), listClaimsValidator, validate, listClaims);
router.get('/claims/:id', claimIdValidator, validate, getClaimById);
router.put('/claims/:id/review', authorize('employee'), requirePermission('insurance.claim.review'), claimIdValidator, validate, startClaimReview);
router.put('/claims/:id/forward-to-manager', authorize('employee'), requirePermission('insurance.claim.review'), claimIdValidator, validate, forwardClaimToManager);
router.put('/claims/:id/manager-review', authorize('admin', 'employee'), requirePermission('insurance.claim.review'), claimIdValidator, managerDecisionValidator, validate, managerReviewClaim);
router.put('/claims/:id/approve', authorize('admin', 'employee'), requirePermission('insurance.approve'), claimIdValidator, approveClaimValidator, validate, approveClaim);
router.put('/claims/:id/reject', authorize('admin', 'employee'), requirePermission('insurance.claim.review'), claimIdValidator, rejectValidator, validate, rejectClaim);
router.put('/claims/:id/settle', authorize('admin'), claimIdValidator, validate, settleClaim);

module.exports = router;
