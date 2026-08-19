const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Branch = require('../models/Branch');
const EmployeeProfile = require('../models/EmployeeProfile');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { escapeRegex } = require('../utils/sanitize');

const generateEmployeeId = async (session) => {
  const year = new Date().getFullYear();

  const lastEmployee = await EmployeeProfile.findOne({
    employeeId: new RegExp(`^EMP-${year}-`)
  })
    .sort({ employeeId: -1 })
    .session(session);

  let sequence = 1;

  if (lastEmployee?.employeeId) {
    const parts = lastEmployee.employeeId.split('-');
    const lastNumber = parseInt(parts[2], 10);

    if (!Number.isNaN(lastNumber)) {
      sequence = lastNumber + 1;
    }
  }

  return `EMP-${year}-${String(sequence).padStart(4, '0')}`;
};

/**
 * CREATE EMPLOYEE
 * Admin only
 */
const createEmployee = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let createdEmployee;

    await session.withTransaction(async () => {
      const {
        fullName,
        email,
        password,
        phone = '',
        address = '',
        branch,
        designation = 'Banking Associate',
        permissions
      } = req.body;

      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({
        email: normalizedEmail
      }).session(session);

      if (existingUser) {
        throw new ApiError(409, 'A user with this email already exists');
      }

      const branchRecord = await Branch.findById(branch).session(session);

      if (!branchRecord) {
        throw new ApiError(404, 'Branch not found');
      }

      if (branchRecord.status !== 'active') {
        throw new ApiError(400, 'Employee can only be assigned to an active branch');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [user] = await User.create(
        [
          {
            fullName,
            email: normalizedEmail,
            passwordHash,
            phone,
            address,
            role: 'employee',
            kycStatus: 'verified',
            isActive: true
          }
        ],
        { session }
      );

      const employeeId = await generateEmployeeId(session);

      const employeePermissions =
        Array.isArray(permissions) && permissions.length > 0
          ? [...new Set(permissions)]
          : [
              'customer.view',
              'account.review',
              'kyc.review',
              'service.process'
            ];

      const [profile] = await EmployeeProfile.create(
        [
          {
            user: user._id,
            employeeId,
            branch: branchRecord._id,
            designation,
            permissions: employeePermissions,
            status: 'active'
          }
        ],
        { session }
      );

      await writeAuditLog({
        actor: req.user,
        action: 'EMPLOYEE_CREATED',
        targetType: 'EmployeeProfile',
        targetId: profile._id,
        after: {
          employeeId: profile.employeeId,
          user: user._id,
          branch: branchRecord._id,
          permissions: profile.permissions,
          designation: profile.designation
        },
        req,
        session
      });

      createdEmployee = {
        employeeId: profile.employeeId,
        user: user.toSafeObject(),
        branch: {
          id: branchRecord._id,
          branchId: branchRecord.branchId,
          branchName: branchRecord.branchName,
          branchCode: branchRecord.branchCode,
          ifsc: branchRecord.ifsc
        },
        designation: profile.designation,
        permissions: profile.permissions,
        status: profile.status
      };
    });

    return new ApiResponse(
      201,
      'Employee created successfully',
      { employee: createdEmployee }
    ).send(res);
  } finally {
    await session.endSession();
  }
});

/**
 * LIST EMPLOYEES
 * Admin only
 */
const listEmployees = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.branch) {
    filter.branch = req.query.branch;
  }

  const userFilter = {};

  if (req.query.search) {
    const searchRegex = new RegExp(
      escapeRegex(req.query.search),
      'i'
    );

    const matchingUsers = await User.find({
      role: 'employee',
      $or: [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    })
      .select('_id')
      .limit(1000);

    const employeeIdRegex = searchRegex;

    filter.$or = [
      { user: { $in: matchingUsers.map((u) => u._id) } },
      { employeeId: employeeIdRegex }
    ];
  }

  const [employees, total] = await Promise.all([
    EmployeeProfile.find(filter)
      .populate(
        'user',
        'fullName email phone address role kycStatus isActive avatarColor createdAt'
      )
      .populate(
        'branch',
        'branchId branchName branchCode ifsc city state status'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    EmployeeProfile.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Employees fetched successfully',
    { employees },
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  ).send(res);
});

/**
 * GET SINGLE EMPLOYEE
 */
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await EmployeeProfile.findById(req.params.id)
    .populate(
      'user',
      'fullName email phone address role kycStatus isActive avatarColor createdAt updatedAt'
    )
    .populate(
      'branch',
      'branchId branchName branchCode ifsc address city state pincode phone email workingHours status'
    );

  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  return new ApiResponse(
    200,
    'Employee fetched successfully',
    { employee }
  ).send(res);
});

/**
 * UPDATE EMPLOYEE BRANCH / PERMISSIONS / DESIGNATION / STATUS
 */
const updateEmployee = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let updatedEmployee;

    await session.withTransaction(async () => {
      const employee = await EmployeeProfile.findById(
        req.params.id
      ).session(session);

      if (!employee) {
        throw new ApiError(404, 'Employee not found');
      }

      const before = employee.toObject();

      if (req.body.branch) {
        const branch = await Branch.findById(
          req.body.branch
        ).session(session);

        if (!branch) {
          throw new ApiError(404, 'Branch not found');
        }

        if (branch.status !== 'active') {
          throw new ApiError(
            400,
            'Employee can only be assigned to an active branch'
          );
        }

        employee.branch = branch._id;
      }

      if (req.body.designation !== undefined) {
        employee.designation = req.body.designation;
      }

      if (req.body.permissions !== undefined) {
        employee.permissions = [
          ...new Set(req.body.permissions)
        ];
      }

      if (req.body.status !== undefined) {
        employee.status = req.body.status;
      }

      await employee.save({ session });

      if (req.body.status !== undefined) {
        await User.findByIdAndUpdate(
          employee.user,
          {
            isActive: req.body.status === 'active'
          },
          {
            session,
            new: true
          }
        );
      }

      await writeAuditLog({
        actor: req.user,
        action: 'EMPLOYEE_UPDATED',
        targetType: 'EmployeeProfile',
        targetId: employee._id,
        before,
        after: employee.toObject(),
        req,
        session
      });

      updatedEmployee = employee;
    });

    const result = await EmployeeProfile.findById(
      updatedEmployee._id
    )
      .populate(
        'user',
        'fullName email phone address role kycStatus isActive avatarColor'
      )
      .populate(
        'branch',
        'branchId branchName branchCode ifsc city state status'
      );

    return new ApiResponse(
      200,
      'Employee updated successfully',
      { employee: result }
    ).send(res);
  } finally {
    await session.endSession();
  }
});

/**
 * DEACTIVATE EMPLOYEE
 */
const deactivateEmployee = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const employee = await EmployeeProfile.findById(
        req.params.id
      ).session(session);

      if (!employee) {
        throw new ApiError(404, 'Employee not found');
      }

      employee.status = 'inactive';
      await employee.save({ session });

      await User.findByIdAndUpdate(
        employee.user,
        {
          isActive: false,
          $inc: { tokenVersion: 1 }
        },
        { session }
      );

      await writeAuditLog({
        actor: req.user,
        action: 'EMPLOYEE_DEACTIVATED',
        targetType: 'EmployeeProfile',
        targetId: employee._id,
        after: {
          employeeId: employee.employeeId,
          status: 'inactive'
        },
        req,
        session
      });
    });

    return new ApiResponse(
      200,
      'Employee deactivated successfully'
    ).send(res);
  } finally {
    await session.endSession();
  }
});

module.exports = {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deactivateEmployee
};