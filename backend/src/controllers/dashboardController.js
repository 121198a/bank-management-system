const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const KYCRequest = require('../models/KYCRequest');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { decimalToString, addMoney } = require('../utils/money');

const serializeTransactions = (items) => items.map((item) => item.toJSON());

const getDashboardStats = asyncHandler(async (req, res) => {
  const { role, _id: userId } = req.user;

  if (role === 'admin') {
    const [totalUsers, totalCustomers, totalEmployees, totalAccounts, pendingAccounts, activeAccounts, pendingKyc, totalTransactions, recentTransactions, transactionVolume, totalVolumeAgg] = await Promise.all([
      User.countDocuments(), User.countDocuments({ role: 'customer' }), User.countDocuments({ role: 'employee' }),
      Account.countDocuments(), Account.countDocuments({ status: 'pending' }), Account.countDocuments({ status: 'active' }),
      KYCRequest.countDocuments({ status: 'pending' }), Transaction.countDocuments(),
      Transaction.find().populate('account', 'accountNumber accountType').populate('performedBy', 'fullName').sort({ createdAt: -1 }).limit(10),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: 'success' } },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' }, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } }
      ]),
      Transaction.aggregate([{ $match: { status: 'success' } }, { $group: { _id: '$type', total: { $sum: '$amount' } } }])
    ]);

    const volumeMap = totalVolumeAgg.reduce((acc, item) => { acc[item._id] = decimalToString(item.total); return acc; }, {});
    const transactionVolumeSerialized = transactionVolume.map((item) => ({ ...item, totalAmount: decimalToString(item.totalAmount) }));

    return new ApiResponse(200, 'Admin dashboard stats fetched successfully', {
      users: { total: totalUsers, customers: totalCustomers, employees: totalEmployees },
      accounts: { total: totalAccounts, pending: pendingAccounts, active: activeAccounts },
      kyc: { pending: pendingKyc },
      transactions: {
        total: totalTransactions,
        totalDeposits: volumeMap.deposit || '0.00',
        totalWithdrawals: volumeMap.withdraw || '0.00',
        totalTransferOut: volumeMap.transfer_out || '0.00'
      },
      recentTransactions: serializeTransactions(recentTransactions),
      transactionVolume: transactionVolumeSerialized
    }).send(res);
  }

  if (role === 'employee') {
    const [pendingAccounts, pendingKyc, recentTransactions, totalCustomers] = await Promise.all([
      Account.countDocuments({ status: 'pending' }), KYCRequest.countDocuments({ status: 'pending' }),
      Transaction.find().populate('account', 'accountNumber accountType').populate('performedBy', 'fullName').sort({ createdAt: -1 }).limit(10),
      User.countDocuments({ role: 'customer' })
    ]);
    return new ApiResponse(200, 'Employee dashboard stats fetched successfully', { pendingAccounts, pendingKyc, totalCustomers, recentTransactions: serializeTransactions(recentTransactions) }).send(res);
  }

  const accounts = await Account.find({ user: userId });
  const accountIds = accounts.map((a) => a._id);
  let totalBalance = '0.00';
  for (const account of accounts) {
    if (account.status === 'active') totalBalance = decimalToString(addMoney(totalBalance, account.balance));
  }

  const [recentTransactions, monthlyVolume, totalTransactions] = await Promise.all([
    Transaction.find({ account: { $in: accountIds } }).sort({ createdAt: -1 }).limit(10),
    Transaction.aggregate([
      { $match: { account: { $in: accountIds }, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, status: 'success' } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' }, totalAmount: { $sum: '$amount' } } },
      { $sort: { '_id.date': 1 } }
    ]),
    Transaction.countDocuments({ account: { $in: accountIds } })
  ]);

  return new ApiResponse(200, 'Customer dashboard stats fetched successfully', {
    accounts,
    totalBalance,
    totalTransactions,
    recentTransactions: serializeTransactions(recentTransactions),
    monthlyVolume: monthlyVolume.map((item) => ({ ...item, totalAmount: decimalToString(item.totalAmount) }))
  }).send(res);
});

module.exports = { getDashboardStats };
