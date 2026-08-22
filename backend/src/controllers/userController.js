const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { escapeRegex } = require('../utils/sanitize');

/**
 * GET /api/users/me
 */
const getMe = asyncHandler(async (req, res) => {
  return new ApiResponse(200, 'Profile fetched successfully', {
    user: req.user.toSafeObject()
  }).send(res);
});

/**
 * PUT /api/users/me
 * Allows updating profile fields and optionally changing password.
 */
const updateMe = asyncHandler(async (req, res) => {
  const { fullName, phone, address, currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash +refreshTokenHash');

  const before = user.toSafeObject();

  if (fullName !== undefined) user.fullName = fullName;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;

  if (newPassword) {
    if (!currentPassword) {
      throw new ApiError(400, 'Current password is required to set a new password');
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(401, 'Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.refreshTokenHash = null;
    user.tokenVersion += 1; // force re-login on other devices
  }

  await user.save();

  await writeAuditLog({
    actor: user,
    action: 'PROFILE_UPDATED',
    targetType: 'User',
    targetId: user._id,
    before,
    after: user.toSafeObject(),
    req
  });

  return new ApiResponse(200, 'Profile updated successfully', {
    user: user.toSafeObject()
  }).send(res);
});

/**
 * GET /api/users
 * Admin only - paginated, filterable, searchable list of users.
 */
const listUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.kycStatus) filter.kycStatus = req.query.kycStatus;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  if (req.query.search) {
    const searchRegex = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ fullName: searchRegex }, { email: searchRegex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Users fetched successfully',
    { users: users.map((u) => u.toSafeObject()) },
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  ).send(res);
});

/**
 * GET /api/users/:id
 * Admin/Employee - fetch a single user's details.
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return new ApiResponse(200, 'User fetched successfully', { user: user.toSafeObject() }).send(res);
});

/**
 * PUT /api/users/:id/role
 * Admin only - change a user's role.
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user._id.equals(req.user._id) && role !== 'admin') {
    throw new ApiError(400, 'You cannot change your own admin role');
  }

  const before = user.toSafeObject();
  user.role = role;
  user.tokenVersion += 1;
  user.refreshTokenHash = null;
  await user.save();

  await writeAuditLog({
    actor: req.user,
    action: 'USER_ROLE_UPDATED',
    targetType: 'User',
    targetId: user._id,
    before,
    after: user.toSafeObject(),
    req
  });

  return new ApiResponse(200, 'User role updated successfully', { user: user.toSafeObject() }).send(res);
});

/**
 * PUT /api/users/:id/status
 * Admin only - activate/deactivate a user account.
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findById(req.params.id).select('+refreshTokenHash');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user._id.equals(req.user._id)) {
    throw new ApiError(400, 'You cannot change your own account status');
  }

  const before = user.toSafeObject();
  user.isActive = isActive;

  if (!isActive) {
    user.refreshTokenHash = null; // force logout
    user.tokenVersion += 1;
  }

  await user.save();

  await writeAuditLog({
    actor: req.user,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    targetType: 'User',
    targetId: user._id,
    before,
    after: user.toSafeObject(),
    req
  });

  return new ApiResponse(200, 'User status updated successfully', { user: user.toSafeObject() }).send(res);
});

/**
 * POST /api/users
 * Admin only — manually create an employee or customer account from the
 * dashboard. This is the ONLY way employee/customer accounts get created
 * besides public self-registration (which only ever creates customers).
 */
const createUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, address, role } = req.body;

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  if (!['employee', 'customer', 'admin'].includes(role)) {
    throw new ApiError(400, 'Role must be employee, customer, or admin');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName,
    email: normalizedEmail,
    passwordHash,
    phone: phone || '',
    address: address || '',
    role,
    kycStatus: role === 'employee' || role === 'admin' ? 'verified' : 'pending',
    isActive: true
  });

  await Notification.create({
    user: user._id,
    title: 'Account Created',
    message: `Welcome to Bank Management System, ${fullName}! Your ${role} account has been created by an administrator.`,
    type: 'success'
  });

  await writeAuditLog({
    actor: req.user,
    action: 'USER_CREATED_BY_ADMIN',
    targetType: 'User',
    targetId: user._id,
    after: user.toSafeObject(),
    req
  });

  return new ApiResponse(201, `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`, {
    user: user.toSafeObject()
  }).send(res);
});

/**
 * PUT /api/users/:id
 * Admin only — edit a user's basic details (name, phone, address, email).
 * Does not touch password or role (those have their own dedicated endpoints).
 */
const editUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email, phone, address } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const before = user.toSafeObject();

  if (fullName !== undefined) user.fullName = fullName;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        throw new ApiError(409, 'A user with this email already exists');
      }
      user.email = normalizedEmail;
    }
  }

  await user.save();

  await writeAuditLog({
    actor: req.user,
    action: 'USER_DETAILS_UPDATED_BY_ADMIN',
    targetType: 'User',
    targetId: user._id,
    before,
    after: user.toSafeObject(),
    req
  });

  return new ApiResponse(200, 'User details updated successfully', { user: user.toSafeObject() }).send(res);
});

module.exports = {
  getMe,
  updateMe,
  listUsers,
  getUserById,
  createUser,
  editUserDetails,
  updateUserRole,
  updateUserStatus
};
