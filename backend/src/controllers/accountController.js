const Account = require('../models/Account');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const generateAccountNumber = require('../utils/accountNumber');
const { writeAuditLog } = require('../middleware/auditLogger');
const { sendAccountStatusEmail } = require('../services/emailService');

/**
 * POST /api/accounts
 * Customer creates a new account request (status: pending until approved).
 */
const createAccount = asyncHandler(async (req, res) => {
  const { accountType, initialDeposit } = req.body;

  let accountNumber;
  let exists = true;
  // Ensure uniqueness (extremely unlikely collision, but guard anyway)
  while (exists) {
    accountNumber = generateAccountNumber();
    // eslint-disable-next-line no-await-in-loop
    exists = await Account.exists({ accountNumber });
  }

  const account = await Account.create({
    accountNumber,
    user: req.user._id,
    accountType,
    balance: initialDeposit || 0,
    status: 'pending'
  });

  await Notification.create({
    user: req.user._id,
    title: 'Account Application Submitted',
    message: `Your ${accountType} account application (${accountNumber}) has been submitted and is pending approval.`,
    type: 'info'
  });

  await writeAuditLog({
    actor: req.user,
    action: 'ACCOUNT_CREATED',
    targetType: 'Account',
    targetId: account._id,
    after: account.toObject(),
    req
  });

  return new ApiResponse(201, 'Account application submitted successfully. Awaiting approval.', {
    account
  }).send(res);
});

/**
 * GET /api/accounts/my
 * Customer - list their own accounts.
 */
const getMyAccounts = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: -1 });

  return new ApiResponse(200, 'Accounts fetched successfully', { accounts }).send(res);
});

/**
 * GET /api/accounts
 * Admin/Employee - paginated, filterable, searchable list of all accounts.
 */
const listAccounts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.accountType) filter.accountType = req.query.accountType;

  let accountIdsFromSearch = null;
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');

    // Search by account number directly, or by matching user's name/email
    const matchingUsers = await User.find({
      $or: [{ fullName: searchRegex }, { email: searchRegex }]
    }).select('_id');

    accountIdsFromSearch = matchingUsers.map((u) => u._id);

    filter.$or = [
      { accountNumber: searchRegex },
      { user: { $in: accountIdsFromSearch } }
    ];
  }

  const [accounts, total] = await Promise.all([
    Account.find(filter)
      .populate('user', 'fullName email kycStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Account.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Accounts fetched successfully',
    { accounts },
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  ).send(res);
});

/**
 * GET /api/accounts/:id
 * Fetch a single account. Customers may only view their own; admin/employee can view any.
 */
const getAccountById = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id).populate('user', 'fullName email kycStatus');

  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  if (req.user.role === 'customer' && !account.user._id.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to view this account');
  }

  return new ApiResponse(200, 'Account fetched successfully', { account }).send(res);
});

/**
 * PUT /api/accounts/:id/approve
 * Employee/Admin - approve a pending account, activating it.
 */
const approveAccount = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id).populate('user', 'fullName email');

  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  if (account.status !== 'pending') {
    throw new ApiError(400, `Account is already ${account.status} and cannot be approved`);
  }

  const before = account.toObject();

  account.status = 'active';
  account.approvedBy = req.user._id;
  account.approvedAt = new Date();
  await account.save();

  await Notification.create({
    user: account.user._id,
    title: 'Account Approved',
    message: `Your account ${account.accountNumber} has been approved and is now active.`,
    type: 'success'
  });

  await sendAccountStatusEmail(account.user.email, account.user.fullName, 'active', account.accountNumber);

  await writeAuditLog({
    actor: req.user,
    action: 'ACCOUNT_APPROVED',
    targetType: 'Account',
    targetId: account._id,
    before,
    after: account.toObject(),
    req
  });

  return new ApiResponse(200, 'Account approved successfully', { account }).send(res);
});

/**
 * PUT /api/accounts/:id/status
 * Admin only - update account status (reject/close/reactivate).
 */
const updateAccountStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

  const account = await Account.findById(req.params.id).populate('user', 'fullName email');

  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  const before = account.toObject();
  account.status = status;
  await account.save();

  await Notification.create({
    user: account.user._id,
    title: 'Account Status Updated',
    message: `Your account ${account.accountNumber} status has been changed to ${status}.${remarks ? ` Remarks: ${remarks}` : ''}`,
    type: status === 'active' ? 'success' : 'warning'
  });

  await sendAccountStatusEmail(account.user.email, account.user.fullName, status, account.accountNumber);

  await writeAuditLog({
    actor: req.user,
    action: 'ACCOUNT_STATUS_UPDATED',
    targetType: 'Account',
    targetId: account._id,
    before,
    after: account.toObject(),
    req
  });

  return new ApiResponse(200, 'Account status updated successfully', { account }).send(res);
});

module.exports = {
  createAccount,
  getMyAccounts,
  listAccounts,
  getAccountById,
  approveAccount,
  updateAccountStatus
};
