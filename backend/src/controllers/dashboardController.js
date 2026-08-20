const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const KYCRequest = require('../models/KYCRequest');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { decimalToString, addMoney } = require('../utils/money');

const serializeTransactions = (items) => items.map((item) => item.toJSON());

const getBankHeadDashboard = async (res) => {
  const LoanApplication = require('../models/LoanApplication');
  const InsurancePolicy = require('../models/InsurancePolicy');
  const InsuranceClaim = require('../models/InsuranceClaim');
  const CollectionCase = require('../models/CollectionCase');
  const SalesLead = require('../models/SalesLead');
  const SecurityIncident = require('../models/SecurityIncident');
  const FraudAlert = require('../models/FraudAlert');

  const [
    totalCustomers, totalAccounts, activeAccounts,
    totalLoans, activeLoans, overdueCollectionCases,
    activePolicies, pendingClaims,
    convertedLeads, openIncidents, openFraudAlerts
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }), Account.countDocuments(), Account.countDocuments({ status: 'active' }),
    LoanApplication.countDocuments(), LoanApplication.countDocuments({ status: 'disbursed' }),
    CollectionCase.countDocuments({ status: { $nin: ['recovered', 'closed'] } }),
    InsurancePolicy.countDocuments({ status: 'active' }), InsuranceClaim.countDocuments({ status: { $in: ['submitted', 'under_review', 'manager_review'] } }),
    SalesLead.countDocuments({ status: 'converted' }), SecurityIncident.countDocuments({ status: { $in: ['open', 'investigating'] } }),
    FraudAlert.countDocuments({ status: { $in: ['open', 'under_review'] } })
  ]);

  return new ApiResponse(200, 'Bank Head dashboard fetched', {
    customers: totalCustomers,
    accounts: { total: totalAccounts, active: activeAccounts },
    loans: { total: totalLoans, disbursed: activeLoans },
    collection: { openCases: overdueCollectionCases },
    insurance: { activePolicies, pendingClaims },
    sales: { convertedLeads },
    security: { openIncidents, openFraudAlerts }
  }).send(res);
};

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
    const EmployeeProfile = require('../models/EmployeeProfile');
    const profile = await EmployeeProfile.findOne({ user: userId, status: 'active' }).populate('department', 'code name');
    const deptCode = profile?.department?.code;

    if (profile?.orgRole === 'bank_head') {
      return getBankHeadDashboard(res);
    }

    if (deptCode === 'LOAN') {
      const { buildScopeFilter } = require('../services/orgScope');
      const LoanApplication = require('../models/LoanApplication');
      const scope = await buildScopeFilter(profile, { branchField: 'branch', departmentField: 'department' });
      const [byStatus, pendingReview, disbursedAgg] = await Promise.all([
        LoanApplication.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        LoanApplication.countDocuments({ ...scope, status: { $in: ['under_review', 'manager_review', 'documents_required'] } }),
        LoanApplication.aggregate([{ $match: { ...scope, status: 'disbursed' } }, { $group: { _id: null, total: { $sum: '$approvedAmount' }, count: { $sum: 1 } } }])
      ]);
      return new ApiResponse(200, 'Loan department dashboard fetched', {
        department: 'LOAN', byStatus, pendingReview,
        disbursedPortfolio: { count: disbursedAgg[0]?.count || 0, totalAmount: decimalToString(disbursedAgg[0]?.total || '0.00') }
      }).send(res);
    }

    if (deptCode === 'INSURANCE') {
      const { buildScopeFilter } = require('../services/orgScope');
      const InsurancePolicy = require('../models/InsurancePolicy');
      const InsuranceClaim = require('../models/InsuranceClaim');
      const scope = await buildScopeFilter(profile, { branchField: 'branch', departmentField: 'department' });
      const [policiesByStatus, claimsByStatus, activePolicies] = await Promise.all([
        InsurancePolicy.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        InsuranceClaim.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        InsurancePolicy.countDocuments({ ...scope, status: 'active' })
      ]);
      return new ApiResponse(200, 'Insurance department dashboard fetched', { department: 'INSURANCE', policiesByStatus, claimsByStatus, activePolicies }).send(res);
    }

    if (deptCode === 'COLLECTION') {
      const { buildScopeFilter } = require('../services/orgScope');
      const CollectionCase = require('../models/CollectionCase');
      const scope = await buildScopeFilter(profile, { branchField: 'branch', departmentField: 'department', assigneeField: 'assignedEmployee' });
      const [byStatus, recoveredAgg, myOpenCases] = await Promise.all([
        CollectionCase.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        CollectionCase.aggregate([{ $match: scope }, { $group: { _id: null, total: { $sum: '$recoveredAmount' } } }]),
        CollectionCase.countDocuments({ assignedEmployee: userId, status: { $nin: ['recovered', 'closed'] } })
      ]);
      return new ApiResponse(200, 'Collection department dashboard fetched', {
        department: 'COLLECTION', byStatus, myOpenCases, totalRecovered: decimalToString(recoveredAgg[0]?.total || '0.00')
      }).send(res);
    }

    if (deptCode === 'SALES') {
      const { buildScopeFilter } = require('../services/orgScope');
      const SalesLead = require('../models/SalesLead');
      const scope = await buildScopeFilter(profile, { branchField: 'branch', departmentField: 'department', assigneeField: 'assignedEmployee' });
      const [byStatus, myLeads, converted] = await Promise.all([
        SalesLead.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        SalesLead.countDocuments({ assignedEmployee: userId, status: { $nin: ['converted', 'lost', 'closed'] } }),
        SalesLead.countDocuments({ ...scope, status: 'converted' })
      ]);
      return new ApiResponse(200, 'Sales department dashboard fetched', { department: 'SALES', byStatus, myLeads, converted }).send(res);
    }

    if (deptCode === 'IT_SECURITY') {
      const SecurityEvent = require('../models/SecurityEvent');
      const SecurityIncident = require('../models/SecurityIncident');
      const FraudAlert = require('../models/FraudAlert');
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [failedLogins24h, openIncidents, openFraudAlerts, recentEvents] = await Promise.all([
        SecurityEvent.countDocuments({ type: 'LOGIN_FAILED', createdAt: { $gte: since24h } }),
        SecurityIncident.countDocuments({ status: { $in: ['open', 'investigating'] } }),
        FraudAlert.countDocuments({ status: { $in: ['open', 'under_review'] } }),
        SecurityEvent.find().sort({ createdAt: -1 }).limit(10)
      ]);
      return new ApiResponse(200, 'IT/Security dashboard fetched', { department: 'IT_SECURITY', failedLogins24h, openIncidents, openFraudAlerts, recentEvents }).send(res);
    }

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
