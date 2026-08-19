const express = require('express');
const {
  getMe,
  updateMe,
  listUsers,
  getUserById,
  createUser,
  editUserDetails,
  updateUserRole,
  updateUserStatus
} = require('../controllers/userController');
const {
  updateProfileValidator,
  userIdParamValidator,
  createUserValidator,
  editUserValidator,
  updateRoleValidator,
  updateStatusValidator,
  listUsersValidator
} = require('../validators/userValidators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { requirePermission } = authorize;

const router = express.Router();

router.use(authenticate);

router.get('/me', getMe);
router.put('/me', updateProfileValidator, validate, updateMe);

router.get('/', authorize('admin', 'employee'), requirePermission('customer.view'), listUsersValidator, validate, listUsers);
router.post('/', authorize('admin'), createUserValidator, validate, createUser);
router.get('/:id', authorize('admin', 'employee'), requirePermission('customer.view'), userIdParamValidator, validate, getUserById);
router.put('/:id', authorize('admin'), editUserValidator, validate, editUserDetails);
router.put('/:id/role', authorize('admin'), updateRoleValidator, validate, updateUserRole);
router.put('/:id/status', authorize('admin'), updateStatusValidator, validate, updateUserStatus);

module.exports = router;
