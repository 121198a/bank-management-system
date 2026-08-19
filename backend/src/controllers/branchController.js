const Branch = require('../models/Branch');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { escapeRegex } = require('../utils/sanitize');

const createBranch = asyncHandler(async (req, res) => {
  try {
    const existingCode = await Branch.findOne({
      branchCode: req.body.branchCode
    });

    if (existingCode) {
      throw new ApiError(409, 'Branch code already exists');
    }

    if (req.body.manager) {
      const manager = await User.findById(req.body.manager).select('_id role');

      if (!manager) {
        throw new ApiError(404, 'Branch manager not found');
      }

      if (!['employee', 'admin'].includes(manager.role)) {
        throw new ApiError(400, 'Branch manager must be an employee or admin');
      }
    }

    const branch = await Branch.create({
      branchId: `BR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      branchName: req.body.branchName,
      branchCode: req.body.branchCode,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
      phone: req.body.phone || '',
      email: req.body.email || '',
      manager: req.body.manager || null,
      workingHours: req.body.workingHours || '9:30 AM - 4:30 PM (Mon-Fri)',
      status: req.body.status || 'active'
    });

    await writeAuditLog({
      actor: req.user,
      action: 'BRANCH_CREATED',
      targetType: 'Branch',
      targetId: branch._id,
      after: branch.toObject(),
      req
    });

    return new ApiResponse(
      201,
      'Branch created successfully',
      { branch }
    ).send(res);
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'Branch ID, branch code or IFSC already exists');
    }

    throw err;
  }
});

const listBranches = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.city) {
    filter.city = new RegExp(
      `^${escapeRegex(req.query.city)}$`,
      'i'
    );
  }

  if (req.query.search) {
    const regex = new RegExp(
      escapeRegex(req.query.search),
      'i'
    );

    filter.$or = [
      { branchId: regex },
      { branchName: regex },
      { branchCode: regex },
      { ifsc: regex },
      { city: regex },
      { state: regex }
    ];
  }

  const [branches, total] = await Promise.all([
    Branch.find(filter)
      .populate('manager', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Branch.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Branches fetched successfully',
    { branches },
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  ).send(res);
});

const getBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id)
    .populate('manager', 'fullName email role');

  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  return new ApiResponse(
    200,
    'Branch fetched successfully',
    { branch }
  ).send(res);
});

const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  if (req.body.manager) {
    const manager = await User.findById(req.body.manager)
      .select('_id role');

    if (!manager) {
      throw new ApiError(404, 'Branch manager not found');
    }

    if (!['employee', 'admin'].includes(manager.role)) {
      throw new ApiError(
        400,
        'Branch manager must be an employee or admin'
      );
    }
  }

  const allowedFields = [
    'branchName',
    'address',
    'city',
    'state',
    'pincode',
    'phone',
    'email',
    'manager',
    'workingHours',
    'status'
  ];

  const before = branch.toObject();

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      branch[field] = req.body[field];
    }
  }

  await branch.save();

  await writeAuditLog({
    actor: req.user,
    action: 'BRANCH_UPDATED',
    targetType: 'Branch',
    targetId: branch._id,
    before,
    after: branch.toObject(),
    req
  });

  return new ApiResponse(
    200,
    'Branch updated successfully',
    { branch }
  ).send(res);
});

const updateBranchStatus = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  const before = branch.toObject();

  branch.status = req.body.status;

  await branch.save();

  await writeAuditLog({
    actor: req.user,
    action: 'BRANCH_STATUS_UPDATED',
    targetType: 'Branch',
    targetId: branch._id,
    before,
    after: branch.toObject(),
    req
  });

  return new ApiResponse(
    200,
    `Branch ${branch.status === 'active' ? 'activated' : 'deactivated'} successfully`,
    { branch }
  ).send(res);
});

module.exports = {
  createBranch,
  listBranches,
  getBranch,
  updateBranch,
  updateBranchStatus
};
