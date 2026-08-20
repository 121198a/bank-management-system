const express = require('express');

const {
  createBranch,
  listBranches,
  getBranch,
  updateBranch,
  updateBranchStatus
} = require('../controllers/branchController');

const {
  createBranchValidator,
  updateBranchValidator,
  branchIdValidator,
  listBranchesValidator
} = require('../validators/branchValidators');

const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);


router.get(
  '/',
  listBranchesValidator,
  validate,
  listBranches
);

router.get(
  '/:id',
  branchIdValidator,
  validate,
  getBranch
);


router.post(
  '/',
  authorize('admin'),
  createBranchValidator,
  validate,
  createBranch
);

router.put(
  '/:id',
  authorize('admin'),
  updateBranchValidator,
  validate,
  updateBranch
);

router.patch(
  '/:id/status',
  authorize('admin'),
  branchIdValidator,
  validate,
  updateBranchStatus
);

module.exports = router;
