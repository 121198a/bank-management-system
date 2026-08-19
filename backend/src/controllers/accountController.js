const mongoose = require('mongoose');
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
const { toDecimal128, decimalToString, addMoney, compareMoney } = require('../utils/money');
const { escapeRegex } = require('../utils/sanitize');
const crypto = require('crypto');

const createAccount = asyncHandler(async (req, res) => {
  const initialDeposit = toDecimal128(req.body.initialDeposit || '0', { allowZero: true });
  let accountNumber;
  while (await Account.exists({ accountNumber: accountNumber = generateAccountNumber() })) {
    // retry on the extremely unlikely collision
  }

  const account = await Account.create({
    accountNumber,
    user: req.user._id,
    accountType: req.body.accountType,
    initialDeposit,
    balance: '0.00',
    currency: 'INR',
    status: 'pending'
  });

  await Notification.create({
    user: req.user._id,
    title: 'Account Application Submitted',
    message: `Your ${req.body.accountType} account application (${accountNumber}) has been submitted and is pending approval.`,
    type: 'info'
  });

  await writeAuditLog({ actor: req.user, action: 'ACCOUNT_CREATED', targetType: 'Account', targetId: account._id, after: account.toJSON(), req });
  return new ApiResponse(201, 'Account application submitted successfully. Awaiting approval.', { account }).send(res);
});

const getMyAccounts = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: -1 });
  return new ApiResponse(200, 'Accounts fetched successfully', { accounts }).send(res);
});

const listAccounts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.accountType) filter.accountType = req.query.accountType;

  if (req.query.search) {
    const searchRegex = new RegExp(escapeRegex(req.query.search), 'i');
    const matchingUsers = await User.find({ $or: [{ fullName: searchRegex }, { email: searchRegex }] }).select('_id').limit(1000);
    filter.$or = [{ accountNumber: searchRegex }, { user: { $in: matchingUsers.map((u) => u._id) } }];
  }

  const [accounts, total] = await Promise.all([
    Account.find(filter).populate('user', 'fullName email kycStatus').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Account.countDocuments(filter)
  ]);
  return new ApiResponse(200, 'Accounts fetched successfully', { accounts }, { page, limit, total, totalPages: Math.ceil(total / limit) }).send(res);
});

const getAccountById = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id).populate('user', 'fullName email kycStatus');
  if (!account) throw new ApiError(404, 'Account not found');
  if (req.user.role === 'customer' && !account.user._id.equals(req.user._id)) throw new ApiError(403, 'You do not have permission to view this account');
  return new ApiResponse(200, 'Account fetched successfully', { account }).send(res);
});

const approveAccount = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const account = await Account.findById(req.params.id).populate('user', 'fullName email').session(session);
      if (!account) throw new ApiError(404, 'Account not found');
      if (account.status !== 'pending') throw new ApiError(400, `Account is already ${account.status} and cannot be approved`);

      const before = account.toJSON();
      account.status = 'active';
      account.approvedBy = req.user._id;
      account.approvedAt = new Date();
      account.balance = account.initialDeposit;
      await account.save({ session });

      if (compareMoney(account.initialDeposit, '0.00') > 0) {
        await Transaction.create([{
          operationId: crypto.randomUUID(),
          account: account._id,
          type: 'deposit',
          amount: account.initialDeposit,
          balanceAfter: account.balance,
          currency: account.currency,
          description: 'Initial deposit at account activation',
          status: 'success',
          performedBy: req.user._id
        }], { session });
      }

      await writeAuditLog({ actor: req.user, action: 'ACCOUNT_APPROVED', targetType: 'Account', targetId: account._id, before, after: account.toJSON(), req, session });
      result = account;
    });

    try {
      await Notification.create({ user: result.user._id, title: 'Account Approved', message: `Your account ${result.accountNumber} has been approved and is now active.`, type: 'success' });
    } catch (notificationError) {
      console.error(`Account approval notification failed: ${notificationError.message}`);
    }
    try { await sendAccountStatusEmail(result.user.email, result.user.fullName, 'active', result.accountNumber); } catch (emailError) { console.error(`Account approval email failed: ${emailError.message}`); }
    return new ApiResponse(200, 'Account approved successfully', { account: result }).send(res);
  } finally {
    await session.endSession();
  }
});

const updateAccountStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  const account = await Account.findById(req.params.id).populate('user', 'fullName email');
  if (!account) throw new ApiError(404, 'Account not found');

  const current = account.status;
  const allowedTransitions = {
    pending: ['rejected'],
    active: ['frozen', 'suspended', 'closed'],
    frozen: ['active', 'closed'],
    suspended: ['active', 'closed'],
    rejected: [],
    closed: []
  };
  if (!allowedTransitions[current].includes(status)) {
    throw new ApiError(400, `Cannot change account status from ${current} to ${status}`);
  }
  if (status === 'closed' && compareMoney(account.balance, '0.00') !== 0) {
    throw new ApiError(400, 'An account must have a zero balance before it can be closed');
  }

  const before = account.toJSON();
  account.status = status;
  await account.save();

  await Notification.create({
    user: account.user._id,
    title: 'Account Status Updated',
    message: `Your account ${account.accountNumber} status has been changed to ${status}.${remarks ? ` Remarks: ${remarks}` : ''}`,
    type: status === 'active' ? 'success' : 'warning'
  });
  await sendAccountStatusEmail(account.user.email, account.user.fullName, status, account.accountNumber);
  await writeAuditLog({ actor: req.user, action: 'ACCOUNT_STATUS_UPDATED', targetType: 'Account', targetId: account._id, before, after: account.toJSON(), req });
  return new ApiResponse(200, 'Account status updated successfully', { account }).send(res);
});

module.exports = { createAccount, getMyAccounts, listAccounts, getAccountById, approveAccount, updateAccountStatus };
