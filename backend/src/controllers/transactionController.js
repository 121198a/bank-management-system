const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { generateStatementPDF } = require('../services/pdfService');

/**
 * Ensures the account belongs to the requesting user (customers) or that the
 * requester is admin/employee (who may operate on any account where permitted).
 */
const getOwnedActiveAccount = async (accountId, user) => {
  const account = await Account.findById(accountId);

  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  if (user.role === 'customer' && !account.user.equals(user._id)) {
    throw new ApiError(403, 'You do not have permission to operate on this account');
  }

  if (account.status !== 'active') {
    throw new ApiError(400, `Account is ${account.status} and cannot perform transactions`);
  }

  return account;
};

/**
 * POST /api/transactions/deposit
 */
const deposit = asyncHandler(async (req, res) => {
  const { accountId, amount, description } = req.body;

  const account = await getOwnedActiveAccount(accountId, req.user);

  account.balance += amount;
  await account.save();

  const transaction = await Transaction.create({
    account: account._id,
    type: 'deposit',
    amount,
    balanceAfter: account.balance,
    description: description || 'Cash deposit',
    status: 'success',
    performedBy: req.user._id
  });

  await Notification.create({
    user: account.user,
    title: 'Deposit Successful',
    message: `${amount.toFixed(2)} ${account.currency} deposited into account ${account.accountNumber}. New balance: ${account.balance.toFixed(2)}.`,
    type: 'success'
  });

  await writeAuditLog({
    actor: req.user,
    action: 'DEPOSIT',
    targetType: 'Transaction',
    targetId: transaction._id,
    after: transaction.toObject(),
    req
  });

  return new ApiResponse(201, 'Deposit successful', { transaction, balance: account.balance }).send(res);
});

/**
 * POST /api/transactions/withdraw
 */
const withdraw = asyncHandler(async (req, res) => {
  const { accountId, amount, description } = req.body;

  const account = await getOwnedActiveAccount(accountId, req.user);

  if (account.balance < amount) {
    throw new ApiError(400, 'Insufficient balance for this withdrawal');
  }

  account.balance -= amount;
  await account.save();

  const transaction = await Transaction.create({
    account: account._id,
    type: 'withdraw',
    amount,
    balanceAfter: account.balance,
    description: description || 'Cash withdrawal',
    status: 'success',
    performedBy: req.user._id
  });

  await Notification.create({
    user: account.user,
    title: 'Withdrawal Successful',
    message: `${amount.toFixed(2)} ${account.currency} withdrawn from account ${account.accountNumber}. New balance: ${account.balance.toFixed(2)}.`,
    type: 'success'
  });

  await writeAuditLog({
    actor: req.user,
    action: 'WITHDRAW',
    targetType: 'Transaction',
    targetId: transaction._id,
    after: transaction.toObject(),
    req
  });

  return new ApiResponse(201, 'Withdrawal successful', { transaction, balance: account.balance }).send(res);
});

/**
 * POST /api/transactions/transfer
 * Transfers funds between two accounts. Uses a Mongoose session/transaction
 * when supported (replica set); falls back to sequential updates otherwise.
 */
const transfer = asyncHandler(async (req, res) => {
  const { fromAccountId, toAccountNumber, amount, description } = req.body;

  const fromAccount = await getOwnedActiveAccount(fromAccountId, req.user);

  const toAccount = await Account.findOne({ accountNumber: toAccountNumber });

  if (!toAccount) {
    throw new ApiError(404, 'Recipient account number not found');
  }

  if (toAccount.status !== 'active') {
    throw new ApiError(400, 'Recipient account is not active');
  }

  if (fromAccount._id.equals(toAccount._id)) {
    throw new ApiError(400, 'Cannot transfer to the same account');
  }

  if (fromAccount.balance < amount) {
    throw new ApiError(400, 'Insufficient balance for this transfer');
  }

  let session;
  let useTransaction = true;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    useTransaction = false;
  }

  try {
    fromAccount.balance -= amount;
    toAccount.balance += amount;

    if (useTransaction) {
      await fromAccount.save({ session });
      await toAccount.save({ session });
    } else {
      await fromAccount.save();
      await toAccount.save();
    }

    const outTx = await Transaction.create(
      [
        {
          account: fromAccount._id,
          relatedAccount: toAccount._id,
          type: 'transfer_out',
          amount,
          balanceAfter: fromAccount.balance,
          description: description || `Transfer to ${toAccount.accountNumber}`,
          status: 'success',
          performedBy: req.user._id
        }
      ],
      useTransaction ? { session } : {}
    );

    const inTx = await Transaction.create(
      [
        {
          account: toAccount._id,
          relatedAccount: fromAccount._id,
          type: 'transfer_in',
          amount,
          balanceAfter: toAccount.balance,
          description: description || `Transfer from ${fromAccount.accountNumber}`,
          status: 'success',
          performedBy: req.user._id
        }
      ],
      useTransaction ? { session } : {}
    );

    if (useTransaction) {
      await session.commitTransaction();
      session.endSession();
    }

    await Notification.create([
      {
        user: fromAccount.user,
        title: 'Transfer Sent',
        message: `${amount.toFixed(2)} ${fromAccount.currency} sent to account ${toAccount.accountNumber}. New balance: ${fromAccount.balance.toFixed(2)}.`,
        type: 'success'
      },
      {
        user: toAccount.user,
        title: 'Transfer Received',
        message: `${amount.toFixed(2)} ${toAccount.currency} received from account ${fromAccount.accountNumber}. New balance: ${toAccount.balance.toFixed(2)}.`,
        type: 'success'
      }
    ]);

    await writeAuditLog({
      actor: req.user,
      action: 'TRANSFER',
      targetType: 'Transaction',
      targetId: outTx[0]._id,
      after: { outTx: outTx[0].toObject(), inTx: inTx[0].toObject() },
      req
    });

    return new ApiResponse(201, 'Transfer successful', {
      transaction: outTx[0],
      balance: fromAccount.balance
    }).send(res);
  } catch (err) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
});

/**
 * GET /api/transactions/account/:accountId
 * Transaction history for a specific account, with pagination and filters.
 */
const getAccountTransactions = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await Account.findById(accountId);
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  if (req.user.role === 'customer' && !account.user.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to view this account');
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { account: account._id };

  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  if (req.query.search) {
    filter.description = new RegExp(req.query.search, 'i');
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Transactions fetched successfully',
    { transactions },
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  ).send(res);
});

/**
 * GET /api/transactions
 * Admin/Employee - all transactions across the system, paginated/filterable/searchable.
 */
const listAllTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    const matchingAccounts = await Account.find({ accountNumber: searchRegex }).select('_id');
    const accountIds = matchingAccounts.map((a) => a._id);

    filter.$or = [
      { description: searchRegex },
      { account: { $in: accountIds } }
    ];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('account', 'accountNumber accountType')
      .populate('relatedAccount', 'accountNumber')
      .populate('performedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Transactions fetched successfully',
    { transactions },
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  ).send(res);
});

/**
 * GET /api/transactions/statement/:accountId/pdf
 * Streams a PDF account statement.
 */
const downloadStatement = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await Account.findById(accountId);
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  if (req.user.role === 'customer' && !account.user.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to access this account statement');
  }

  const user = await User.findById(account.user);

  const filter = { account: account._id };
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const transactions = await Transaction.find(filter).sort({ createdAt: 1 });

  await writeAuditLog({
    actor: req.user,
    action: 'STATEMENT_DOWNLOADED',
    targetType: 'Account',
    targetId: account._id,
    req
  });

  generateStatementPDF(res, account, user, transactions, {
    from: req.query.from,
    to: req.query.to
  });
});

module.exports = {
  deposit,
  withdraw,
  transfer,
  getAccountTransactions,
  listAllTransactions,
  downloadStatement
};
