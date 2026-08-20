const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { idValidator, listValidator, updateValidator } = require('../validators/departmentValidators');
const { listDepartments, getDepartmentById, updateDepartment } = require('../controllers/departmentController');

const router = express.Router();
router.use(authenticate);

router.get('/', listValidator, validate, listDepartments);
router.get('/:id', idValidator, validate, getDepartmentById);
router.put('/:id', authorize('admin'), idValidator, updateValidator, validate, updateDepartment);

module.exports = router;
