import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, TrendingUp, Clock, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import { dashboardAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/ui/StatsCard';
import VolumeChart from '../../components/charts/VolumeChart';
import TransactionTable from '../../components/charts/TransactionTable';
import { CardSkeleton, TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const QuickAction = ({ to, icon: Icon, label, hint, color }) => (
  <Link to={to} className="group rounded-2xl border border-gray-100 dark:border-banking-border bg-white dark:bg-banking-card p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all">
    <div className={`w-11 h-11 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg mb-3 group-hover:scale-105 transition-transform`}><Icon className="w-5 h-5" /></div>
    <p className="text-sm font-bold text-gray-800 dark:text-white">{label}</p><p className="text-[11px] text-gray-400 mt-1">{hint}</p>
  </Link>
);

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { dashboardAPI.getStats().then((d) => setStats(d.data)).catch((err) => toast.error(getErrorMessage(err))).finally(() => setLoading(false)); }, []);
  const totalBalance = stats?.totalBalance ?? 0;
  const accounts = stats?.accounts ?? [];
  const activeAccounts = accounts.filter(a => a.status === 'active');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return <div className="space-y-6">
    <section className="premium-card p-6 sm:p-7 bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 text-white border-0 shadow-xl shadow-slate-300/30 dark:shadow-black/30">
      <div className="absolute -right-20 -top-24 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-slate-300"><Sparkles className="w-3.5 h-3.5 text-primary-300" /> Personal banking overview</div><h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-4">Good {greeting}, {user?.fullName?.split(' ')[0]} 👋</h2><p className="text-slate-300 mt-2">Everything important about your money, in one place.</p></div>
        <div className="min-w-[220px] rounded-2xl bg-white/10 border border-white/10 backdrop-blur p-4"><p className="text-xs text-slate-400">Total available balance</p><p className="text-3xl font-bold mt-1">{loading ? '••••••' : formatCurrency(totalBalance)}</p><p className="text-xs text-primary-300 mt-2 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {activeAccounts.length} active account(s)</p></div>
      </div>
    </section>

    {user?.kycStatus !== 'verified' && <Link to="/dashboard/kyc" className="flex items-center justify-between gap-4 rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/40 px-4 py-3 hover:border-yellow-300 transition-colors"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-yellow-600" /></div><div><p className="text-sm font-bold text-yellow-900 dark:text-yellow-300">Complete your KYC verification</p><p className="text-xs text-yellow-700/80 dark:text-yellow-400/80">Verify your identity to unlock full banking access.</p></div></div><span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">Review →</span></Link>}

    {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Balance" value={formatCurrency(totalBalance)} subtitle={`${activeAccounts.length} active account(s)`} icon={TrendingUp} iconBg="bg-primary-100 dark:bg-primary-900/30" iconColor="text-primary-600 dark:text-primary-400" />
      <StatsCard title="Total Accounts" value={accounts.length} subtitle={`${accounts.filter(a => a.status === 'pending').length} pending approval`} icon={CreditCard} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
      <StatsCard title="Transactions" value={stats?.totalTransactions ?? 0} subtitle="All time activity" icon={Clock} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
      <StatsCard title="KYC Status" value={user?.kycStatus === 'verified' ? 'Verified' : 'Pending'} subtitle={user?.kycStatus === 'verified' ? 'Full access enabled' : 'Submit documents'} icon={ShieldCheck} iconBg={user?.kycStatus === 'verified' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} iconColor={user?.kycStatus === 'verified' ? 'text-green-600' : 'text-yellow-600'} />
    </div>}

    <section><div className="flex items-end justify-between mb-3"><div><h3 className="font-bold text-gray-900 dark:text-white">Quick actions</h3><p className="text-xs text-gray-400 mt-1">Common banking tasks</p></div></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><QuickAction to="/dashboard/deposit" icon={ArrowDownToLine} label="Deposit" hint="Add money" color="bg-emerald-500" /><QuickAction to="/dashboard/withdraw" icon={ArrowUpFromLine} label="Withdraw" hint="Take out money" color="bg-rose-500" /><QuickAction to="/dashboard/transfer" icon={ArrowLeftRight} label="Transfer" hint="Send money" color="bg-blue-500" /><QuickAction to="/dashboard/accounts" icon={CreditCard} label="Accounts" hint="Manage accounts" color="bg-violet-500" /></div></section>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6"><div className="xl:col-span-2"><VolumeChart data={stats?.monthlyVolume || []} title="30-Day Transaction Activity" /></div><div className="card p-5"><div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-gray-800 dark:text-white">My accounts</h3><p className="text-xs text-gray-400 mt-1">Your active products</p></div><Link to="/dashboard/accounts" className="text-xs text-primary-600 font-bold">View all</Link></div>{loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div> : activeAccounts.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm"><CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No active accounts</p></div> : <div className="space-y-3">{activeAccounts.map((acc) => <div key={acc._id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-banking-darker border border-gray-100 dark:border-banking-border"><div><p className="text-xs font-mono text-gray-500">•••• {String(acc.accountNumber).slice(-4)}</p><p className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize mt-1">{acc.accountType}</p></div><p className="text-sm font-bold text-primary-600">{formatCurrency(acc.balance)}</p></div>)}</div>}</div></div>
    <div className="card p-5"><div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-gray-800 dark:text-white">Recent transactions</h3><p className="text-xs text-gray-400 mt-1">Latest account activity</p></div><Link to="/dashboard/transactions" className="text-xs text-primary-600 font-bold">View all</Link></div>{loading ? <TableSkeleton rows={5} cols={5} /> : <TransactionTable transactions={stats?.recentTransactions?.slice(0, 5) || []} />}</div>
  </div>;
};
export default CustomerDashboard;
