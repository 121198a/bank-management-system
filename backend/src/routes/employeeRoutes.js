const express = require('express');

const {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deactivateEmployee
} = require('../controllers/employeeController');

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const {
  createEmployeeValidator,
  listEmployeesValidator,
  updateEmployeeValidator,
  employeeIdValidator
} = require('../validators/employeeValidators');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.post(
  '/',
  createEmployeeValidator,
  validate,
  createEmployee
);

router.get(
  '/',
  listEmployeesValidator,
  validate,
  listEmployees
);

router.get(
  '/:id',
  employeeIdValidator,
  validate,
  getEmployee
);

router.patch(
  '/:id',
  updateEmployeeValidator,
  validate,
  updateEmployee
);

router.patch(
  '/:id/deactivate',
  employeeIdValidator,
  validate,
  deactivateEmployee
);

module.exports = router;