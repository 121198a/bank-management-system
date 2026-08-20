const mongoose = require('mongoose');
const crypto = require('crypto');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { generateStatementPDF } = require('../services/pdfService');
const { toDecimal128, decimalToString, addMoney, subtractMoney, compareMoney } = require('../utils/money');
const { beginIdempotentOperation, completeIdempotentOperation } = require('../utils/idempotency');
const { escapeRegex } = require('../utils/sanitize');

const getOwnedActiveAccount = async (accountId, user, session = null) => {
  const query = Account.findById(accountId);
  if (session) query.session(session);
  const account = await query;

  if (!account) throw new ApiError(404, 'Account not found');
  if (user.role === 'customer' && !account.user.equals(user._id)) {
    throw new ApiError(403, 'You do not have permission to operate on this account');
  }
  if (account.status !== 'active') {
    throw new ApiError(400, `Account is ${account.status} and cannot perform transactions`);
  }
  return account;
};

const getExistingIdempotentResult = async ({ req, actorId, operation }) => {
  const key = String(req.get('Idempotency-Key') || '').trim();
  if (!key) return null;
  const result = await beginIdempotentOperation({ req, actorId, operation, session: null });
  if (!result.replay) return result;

  const tx = await Transaction.findOne({ idempotencyKey: key }).populate('relatedAccount', 'accountNumber');
  if (tx) {
    const response = {
      transaction: tx,
      balance: decimalToString(tx.balanceAfter)
    };
    await completeIdempotentOperation({ record: result.record, statusCode: 201, response, session: null });
    return { record: result.record, replay: true, response };
  }

  return { record: result.record, replay: true, response: result.record.response };
};

const beginOperation = async ({ req, operation }) => {
  const result = await getExistingIdempotentResult({
    req,
    actorId: req.user._id,
    operation
  });

  if (!result) {
    return {
      record: null,
      replay: false,
      response: null
    };
  }

  if (result.replay) {
    if (!result.response) {
      throw new ApiError(
        409,
        'A request with this Idempotency-Key is still being processed'
      );
    }

    return result;
  }

  return result;
};

const failOperation = async (record) => {
  if (!record) return;
  try {
    await record.deleteOne();
  } catch (_) {
  }
};

const deposit = asyncHandler(async (req, res) => {
  const operation = await beginOperation({ req, operation: 'deposit' });
  if (operation.replay) return new ApiResponse(operation.record.statusCode, 'Deposit already processed', operation.response).send(res);

  const amount = toDecimal128(req.body.amount);
  const session = await mongoose.startSession();
  const operationId = crypto.randomUUID();

  let committed = false;
  try {
    let response;
    let notificationPayload;
    await session.withTransaction(async () => {
      const account = await getOwnedActiveAccount(req.body.accountId, req.user, session);
      const beforeBalance = account.balance;
      account.balance = addMoney(account.balance, amount);
      await account.save({ session });

      const [transaction] = await Transaction.create([{
        operationId,
        idempotencyKey: operation.record.key,
        account: account._id,
        type: 'deposit',
        amount,
        balanceAfter: account.balance,
        currency: account.currency,
        description: req.body.description || 'Cash deposit',
        status: 'success',
        performedBy: req.user._id
      }], { session });

      response = {
        transaction: transaction.toJSON(),
        balance: decimalToString(account.balance)
      };

      await completeIdempotentOperation({ record: operation.record, statusCode: 201, response, session });

      notificationPayload = { user: account.user, accountNumber: account.accountNumber, currency: account.currency, balance: decimalToString(account.balance) };

      await writeAuditLog({ actor: req.user, action: 'DEPOSIT', targetType: 'Transaction', targetId: transaction._id, before: { balance: decimalToString(beforeBalance) }, after: transaction.toJSON(), req, session });
    });
    committed = true;

    if (notificationPayload) {
      try { await Notification.create({ user: notificationPayload.user, title: 'Deposit Successful', message: `${decimalToString(amount)} ${notificationPayload.currency} deposited into account ${notificationPayload.accountNumber}. New balance: ${notificationPayload.balance}.`, type: 'success' }); } catch (notificationError) { console.error(`Deposit notification failed: ${notificationError.message}`); }
    }
    return new ApiResponse(201, 'Deposit successful', response).send(res);
  } catch (err) {
    if (!committed) await failOperation(operation.record);
    throw err;
  } finally {
    await session.endSession();
  }
});

const withdraw = asyncHandler(async (req, res) => {
  const operation = await beginOperation({ req, operation: 'withdraw' });
  if (operation.replay) return new ApiResponse(operation.record.statusCode, 'Withdrawal already processed', operation.response).send(res);

  const amount = toDecimal128(req.body.amount);
  const session = await mongoose.startSession();
  const operationId = crypto.randomUUID();

  let committed = false;
  try {
    let response;
    let notificationPayload;
    await session.withTransaction(async () => {
      const account = await getOwnedActiveAccount(req.body.accountId, req.user, session);
      if (compareMoney(account.balance, amount) < 0) throw new ApiError(400, 'Insufficient balance for this withdrawal');

      const beforeBalance = account.balance;
      account.balance = subtractMoney(account.balance, amount);
      await account.save({ session });

      const [transaction] = await Transaction.create([{
        operationId,
        idempotencyKey: operation.record.key,
        account: account._id,
        type: 'withdraw',
        amount,
        balanceAfter: account.balance,
        currency: account.currency,
        description: req.body.description || 'Cash withdrawal',
        status: 'success',
        performedBy: req.user._id
      }], { session });

      response = {
        transaction: transaction.toJSON(),
        balance: decimalToString(account.balance)
      };
      await completeIdempotentOperation({ record: operation.record, statusCode: 201, response, session });

      notificationPayload = { user: account.user, accountNumber: account.accountNumber, currency: account.currency, balance: decimalToString(account.balance) };

      await writeAuditLog({ actor: req.user, action: 'WITHDRAW', targetType: 'Transaction', targetId: transaction._id, before: { balance: decimalToString(beforeBalance) }, after: transaction.toJSON(), req, session });
    });
    committed = true;

    if (notificationPayload) {
      try { await Notification.create({ user: notificationPayload.user, title: 'Withdrawal Successful', message: `${decimalToString(amount)} ${notificationPayload.currency} withdrawn from account ${notificationPayload.accountNumber}. New balance: ${notificationPayload.balance}.`, type: 'success' }); } catch (notificationError) { console.error(`Withdrawal notification failed: ${notificationError.message}`); }
    }
    return new ApiResponse(201, 'Withdrawal successful', response).send(res);
  } catch (err) {
    if (!committed) await failOperation(operation.record);
    throw err;
  } finally {
    await session.endSession();
  }
});

const transfer = asyncHandler(async (req, res) => {
  const operation = await beginOperation({ req, operation: 'transfer' });
  if (operation.replay) return new ApiResponse(operation.record.statusCode, 'Transfer already processed', operation.response).send(res);

  const amount = toDecimal128(req.body.amount);
  const session = await mongoose.startSession();
  const operationId = crypto.randomUUID();

  let committed = false;
  try {
    let response;
    let notificationPayload;
    await session.withTransaction(async () => {
      const fromAccount = await getOwnedActiveAccount(req.body.fromAccountId, req.user, session);
      const toAccount = await Account.findOne({ accountNumber: req.body.toAccountNumber }).session(session);

      if (!toAccount) throw new ApiError(404, 'Recipient account number not found');
      if (toAccount.status !== 'active') throw new ApiError(400, 'Recipient account is not active');
      if (fromAccount._id.equals(toAccount._id)) throw new ApiError(400, 'Cannot transfer to the same account');
      if (fromAccount.currency !== toAccount.currency) throw new ApiError(400, 'Source and recipient currencies must match');
      if (compareMoney(fromAccount.balance, amount) < 0) throw new ApiError(400, 'Insufficient balance for this transfer');

      const accountsInOrder = [fromAccount, toAccount].sort((a, b) => String(a._id).localeCompare(String(b._id)));
      for (const account of accountsInOrder) {
        if (account._id.equals(fromAccount._id)) account.balance = subtractMoney(account.balance, amount);
        else account.balance = addMoney(account.balance, amount);
        // eslint-disable-next-line no-await-in-loop
        await account.save({ session });
      }

      const [outTx] = await Transaction.create([{
        operationId,
        idempotencyKey: operation.record.key,
        account: fromAccount._id,
        relatedAccount: toAccount._id,
        type: 'transfer_out',
        amount,
        balanceAfter: fromAccount.balance,
        currency: fromAccount.currency,
        description: req.body.description || `Transfer to ${toAccount.accountNumber}`,
        status: 'success',
        performedBy: req.user._id
      }], { session });

      const [inTx] = await Transaction.create([{
        operationId,
        account: toAccount._id,
        relatedAccount: fromAccount._id,
        type: 'transfer_in',
        amount,
        balanceAfter: toAccount.balance,
        currency: toAccount.currency,
        description: req.body.description || `Transfer from ${fromAccount.accountNumber}`,
        status: 'success',
        performedBy: req.user._id
      }], { session });

      response = {
        transaction: outTx.toJSON(),
        balance: decimalToString(fromAccount.balance),
        reference: outTx.reference
      };
      await completeIdempotentOperation({ record: operation.record, statusCode: 201, response, session });

      notificationPayload = { fromUser: fromAccount.user, toUser: toAccount.user, fromAccount: fromAccount.accountNumber, toAccount: toAccount.accountNumber, currency: fromAccount.currency, balance: decimalToString(fromAccount.balance) };

      await writeAuditLog({
        actor: req.user,
        action: 'TRANSFER',
        targetType: 'Transaction',
        targetId: outTx._id,
        after: { outTx: outTx.toJSON(), inTx: inTx.toJSON() },
        req,
        session
      });
    });
    committed = true;

    if (notificationPayload) {
      try { await Notification.create([
        { user: notificationPayload.fromUser, title: 'Transfer Sent', message: `${decimalToString(amount)} ${notificationPayload.currency} sent to account ${notificationPayload.toAccount}. New balance: ${notificationPayload.balance}.`, type: 'success' },
        { user: notificationPayload.toUser, title: 'Transfer Received', message: `${decimalToString(amount)} ${notificationPayload.currency} received from account ${notificationPayload.fromAccount}.`, type: 'success' }
      ]); } catch (notificationError) { console.error(`Transfer notification failed: ${notificationError.message}`); }
    }
    return new ApiResponse(201, 'Transfer successful', response).send(res);
  } catch (err) {
    if (!committed) await failOperation(operation.record);
    throw err;
  } finally {
    await session.endSession();
  }
});

const getAccountTransactions = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.accountId);
  if (!account) throw new ApiError(404, 'Account not found');
  if (req.user.role === 'customer' && !account.user.equals(req.user._id)) throw new ApiError(403, 'You do not have permission to view this account');

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
  if (req.query.search) filter.description = new RegExp(escapeRegex(req.query.search), 'i');

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter)
  ]);
  return new ApiResponse(200, 'Transactions fetched successfully', { transactions }, { page, limit, total, totalPages: Math.ceil(total / limit) }).send(res);
});

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
    const searchRegex = new RegExp(escapeRegex(req.query.search), 'i');
    const matchingAccounts = await Account.find({ accountNumber: searchRegex }).select('_id').limit(1000);
    filter.$or = [{ description: searchRegex }, { account: { $in: matchingAccounts.map((a) => a._id) } }];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).populate('account', 'accountNumber accountType').populate('relatedAccount', 'accountNumber').populate('performedBy', 'fullName email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter)
  ]);
  return new ApiResponse(200, 'Transactions fetched successfully', { transactions }, { page, limit, total, totalPages: Math.ceil(total / limit) }).send(res);
});

const downloadStatement = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.accountId);
  if (!account) throw new ApiError(404, 'Account not found');
  if (req.user.role === 'customer' && !account.user.equals(req.user._id)) throw new ApiError(403, 'You do not have permission to access this account statement');

  const user = await User.findById(account.user);
  const filter = { account: account._id };
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  const transactions = await Transaction.find(filter).sort({ createdAt: 1 });

  await writeAuditLog({ actor: req.user, action: 'STATEMENT_DOWNLOADED', targetType: 'Account', targetId: account._id, req });
  generateStatementPDF(res, account, user, transactions, { from: req.query.from, to: req.query.to });
});

module.exports = { deposit, withdraw, transfer, getAccountTransactions, listAllTransactions, downloadStatement };
