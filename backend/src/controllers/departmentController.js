const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');

const listDepartments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const departments = await Department.find(filter).populate('head', 'fullName email').sort({ name: 1 });
  return new ApiResponse(200, 'Departments fetched', { departments }).send(res);
});

const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id).populate('head', 'fullName email');
  if (!department) throw new ApiError(404, 'Department not found');
  return new ApiResponse(200, 'Department fetched', { department }).send(res);
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw new ApiError(404, 'Department not found');

  const before = department.toJSON();
  if (req.body.name !== undefined) department.name = req.body.name;
  if (req.body.description !== undefined) department.description = req.body.description;
  if (req.body.status !== undefined) department.status = req.body.status;
  if (req.body.head !== undefined) department.head = req.body.head || null;
  await department.save();

  await writeAuditLog({ actor: req.user, action: 'DEPARTMENT_UPDATED', targetType: 'Department', targetId: department._id, before, after: department.toJSON(), req });
  return new ApiResponse(200, 'Department updated', { department }).send(res);
});

module.exports = { listDepartments, getDepartmentById, updateDepartment };
