import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard, ShieldCheck, Users, History, ArrowUpRight, BriefcaseBusiness,
  Banknote, Umbrella, PhoneCall, TrendingUp, ShieldAlert, Landmark
} from 'lucide-react';
import { dashboardAPI } from '../../api';
import StatsCard from '../../components/ui/StatsCard';
import TransactionTable from '../../components/charts/TransactionTable';
import { CardSkeleton, TableSkeleton } from '../../components/skeletons/Skeletons';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const StatGrid = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>;

const BankHeadDashboard = ({ stats }) => (
  <StatGrid>
    <StatsCard title="Total Customers" value={stats.customers ?? 0} icon={Users} />
    <StatsCard title="Accounts" value={stats.accounts?.total ?? 0} subtitle={`${stats.accounts?.active ?? 0} active`} icon={CreditCard} />
    <StatsCard title="Loans" value={stats.loans?.total ?? 0} subtitle={`${stats.loans?.disbursed ?? 0} disbursed`} icon={Banknote} />
    <StatsCard title="Active Policies" value={stats.insurance?.activePolicies ?? 0} subtitle={`${stats.insurance?.pendingClaims ?? 0} pending claims`} icon={Umbrella} />
    <StatsCard title="Open Collection Cases" value={stats.collection?.openCases ?? 0} icon={PhoneCall} />
    <StatsCard title="Converted Leads" value={stats.sales?.convertedLeads ?? 0} icon={TrendingUp} />
    <StatsCard title="Open Incidents" value={stats.security?.openIncidents ?? 0} icon={ShieldAlert} />
    <StatsCard title="Open Fraud Alerts" value={stats.security?.openFraudAlerts ?? 0} icon={ShieldAlert} />
  </StatGrid>
);

const LoanDeptDashboard = ({ stats }) => {
  const byStatus = Object.fromEntries((stats.byStatus || []).map((s) => [s._id, s.count]));
  return <StatGrid>
    <StatsCard title="Pending Review" value={stats.pendingReview ?? 0} icon={Banknote} />
    <StatsCard title="Disbursed" value={stats.disbursedPortfolio?.count ?? 0} subtitle={formatCurrency(stats.disbursedPortfolio?.totalAmount)} icon={Banknote} />
    <StatsCard title="Manager Review" value={byStatus.manager_review ?? 0} icon={Banknote} />
    <StatsCard title="Rejected" value={byStatus.rejected ?? 0} icon={Banknote} />
  </StatGrid>;
};

const InsuranceDeptDashboard = ({ stats }) => {
  const claimsByStatus = Object.fromEntries((stats.claimsByStatus || []).map((s) => [s._id, s.count]));
  return <StatGrid>
    <StatsCard title="Active Policies" value={stats.activePolicies ?? 0} icon={Umbrella} />
    <StatsCard title="Pending Claims" value={(claimsByStatus.submitted ?? 0) + (claimsByStatus.under_review ?? 0)} icon={Umbrella} />
    <StatsCard title="Manager Review" value={claimsByStatus.manager_review ?? 0} icon={Umbrella} />
    <StatsCard title="Settled" value={claimsByStatus.settled ?? 0} icon={Umbrella} />
  </StatGrid>;
};

const CollectionDeptDashboard = ({ stats }) => (
  <StatGrid>
    <StatsCard title="My Open Cases" value={stats.myOpenCases ?? 0} icon={PhoneCall} />
    <StatsCard title="Total Recovered" value={formatCurrency(stats.totalRecovered)} icon={PhoneCall} />
  </StatGrid>
);

const SalesDeptDashboard = ({ stats }) => (
  <StatGrid>
    <StatsCard title="My Active Leads" value={stats.myLeads ?? 0} icon={TrendingUp} />
    <StatsCard title="Converted" value={stats.converted ?? 0} icon={TrendingUp} />
  </StatGrid>
);

const SecurityDeptDashboard = ({ stats }) => (
  <StatGrid>
    <StatsCard title="Failed Logins (24h)" value={stats.failedLogins24h ?? 0} icon={ShieldAlert} />
    <StatsCard title="Open Incidents" value={stats.openIncidents ?? 0} icon={ShieldAlert} />
    <StatsCard title="Open Fraud Alerts" value={stats.openFraudAlerts ?? 0} icon={ShieldAlert} />
  </StatGrid>
);

const DEPT_VIEWS = { LOAN: LoanDeptDashboard, INSURANCE: InsuranceDeptDashboard, COLLECTION: CollectionDeptDashboard, SALES: SalesDeptDashboard, IT_SECURITY: SecurityDeptDashboard };

const EmployeeDashboard = () => {
  const { user } = useAuth(); const [stats, setStats] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { dashboardAPI.getStats().then((d) => setStats(d.data)).catch((err) => toast.error(getErrorMessage(err))).finally(() => setLoading(false)); }, []);
  const hour = new Date().getHours(); const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  const isBankHead = stats && !stats.department && stats.accounts;
  const DeptView = stats?.department ? DEPT_VIEWS[stats.department] : null;

  return <div className="space-y-6">
    <section className="premium-card p-6 sm:p-7 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 shadow-sm"><div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5"><div><div className="hero-chip">{isBankHead ? <Landmark className="w-3.5 h-3.5 text-violet-300" /> : <BriefcaseBusiness className="w-3.5 h-3.5 text-violet-300" />} {isBankHead ? 'Organization-wide overview' : stats?.department ? `${stats.department.replaceAll('_',' ')} workspace` : 'Operations workspace'}</div><h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-4">Good {greeting}, {user?.fullName?.split(' ')[0]}</h1><p className="text-gray-600 dark:text-slate-300 mt-2">{isBankHead ? 'Organization-wide figures for every branch and team.' : 'Review pending requests and keep operations moving.'}</p></div></div></section>

    {loading ? <StatGrid>{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</StatGrid> : (
      isBankHead ? <BankHeadDashboard stats={stats} /> :
      DeptView ? <DeptView stats={stats} /> :
      <StatGrid><StatsCard title="Pending Accounts" value={stats?.pendingAccounts ?? 0} subtitle="Awaiting approval" icon={CreditCard} /><StatsCard title="Pending KYC" value={stats?.pendingKyc ?? 0} subtitle="Documents to review" icon={ShieldCheck} /><StatsCard title="Total Customers" value={stats?.totalCustomers ?? 0} subtitle="Registered users" icon={Users} /><StatsCard title="Recent Transactions" value={stats?.recentTransactions?.length ?? 0} subtitle="Latest activity" icon={History} /></StatGrid>
    )}

    {!loading && !isBankHead && !DeptView && (stats?.pendingAccounts > 0 || stats?.pendingKyc > 0) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{stats?.pendingAccounts > 0 && <Link to="/employee/accounts" className="card p-5 group border-l-4 border-orange-400 hover:-translate-y-0.5 hover:shadow-lg transition-all"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-gray-800 dark:text-gray-200">{stats.pendingAccounts} account{stats.pendingAccounts > 1 ? 's' : ''} awaiting approval</p><p className="text-xs text-gray-500 mt-1">Review customer requests</p></div><ArrowUpRight className="w-5 h-5 text-orange-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></div></Link>}{stats?.pendingKyc > 0 && <Link to="/employee/kyc" className="card p-5 group border-l-4 border-yellow-400 hover:-translate-y-0.5 hover:shadow-lg transition-all"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-gray-800 dark:text-gray-200">{stats.pendingKyc} KYC request{stats.pendingKyc > 1 ? 's' : ''} pending</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review submitted documents</p></div><ArrowUpRight className="w-5 h-5 text-yellow-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></div></Link>}</div>}

    {!loading && !isBankHead && !DeptView && <div className="card p-5"><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-gray-800 dark:text-white">Recent transactions</h2><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest operational activity</p></div><Link to="/employee/transactions" className="text-xs text-primary-700 dark:text-primary-400 font-bold">View all</Link></div>{loading ? <TableSkeleton rows={5} cols={6} /> : <TransactionTable transactions={stats?.recentTransactions || []} showAccount />}</div>}
  </div>;
};
export default EmployeeDashboard;
