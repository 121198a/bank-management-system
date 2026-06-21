import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, TrendingUp, Clock } from 'lucide-react';
import { dashboardAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/ui/StatsCard';
import VolumeChart from '../../components/charts/VolumeChart';
import TransactionTable from '../../components/charts/TransactionTable';
import { CardSkeleton, TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const QuickAction = ({ to, icon: Icon, label, color }) => (
  <Link to={to} className="card p-4 flex flex-col items-center gap-2 hover:shadow-card-hover transition-all duration-200 group cursor-pointer">
    <div className={"w-12 h-12 rounded-2xl " + color + " flex items-center justify-center group-hover:scale-110 transition-transform"}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
  </Link>
);

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then((d) => setStats(d.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = stats?.totalBalance ?? 0;
  const accounts = stats?.accounts ?? [];
  const activeAccounts = accounts.filter(a => a.status === 'active');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Good {greeting}, {user?.fullName?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Here's your financial overview</p>
        </div>
        {user?.kycStatus !== 'verified' && (
          <Link to="/dashboard/kyc" className="badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 py-1.5 px-3 text-xs font-semibold">
            KYC Pending — Complete Now
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Balance" value={formatCurrency(totalBalance)}
            subtitle={activeAccounts.length + " active account(s)"} icon={TrendingUp}
            iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400" />
          <StatsCard title="Total Accounts" value={accounts.length}
            subtitle={accounts.filter(a => a.status === 'pending').length + " pending approval"} icon={CreditCard}
            iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
          <StatsCard title="Total Transactions" value={stats?.totalTransactions ?? 0}
            subtitle="All time" icon={Clock}
            iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
          <StatsCard title="KYC Status"
            value={user?.kycStatus === 'verified' ? 'Verified' : 'Pending'}
            subtitle={user?.kycStatus === 'verified' ? 'Full access enabled' : 'Submit documents'}
            icon={ArrowDownToLine}
            iconBg={user?.kycStatus === 'verified' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}
            iconColor={user?.kycStatus === 'verified' ? 'text-green-600' : 'text-yellow-600'} />
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction to="/dashboard/deposit" icon={ArrowDownToLine} label="Deposit" color="bg-green-500" />
          <QuickAction to="/dashboard/withdraw" icon={ArrowUpFromLine} label="Withdraw" color="bg-red-500" />
          <QuickAction to="/dashboard/transfer" icon={ArrowLeftRight} label="Transfer" color="bg-blue-500" />
          <QuickAction to="/dashboard/accounts" icon={CreditCard} label="Accounts" color="bg-purple-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VolumeChart data={stats?.monthlyVolume || []} title="30-Day Transaction Activity" />
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">My Accounts</h3>
            <Link to="/dashboard/accounts" className="text-xs text-primary-600 font-medium hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
          ) : activeAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No active accounts</p>
              <Link to="/dashboard/accounts" className="text-primary-600 text-xs mt-1 inline-block">Open one now</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAccounts.map((acc) => (
                <div key={acc._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-banking-darker">
                  <div>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{acc.accountNumber}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize">{acc.accountType}</p>
                  </div>
                  <p className="text-sm font-bold text-primary-600">{formatCurrency(acc.balance)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Transactions</h3>
          <Link to="/dashboard/transactions" className="text-xs text-primary-600 font-medium hover:underline">View all</Link>
        </div>
        {loading ? <TableSkeleton rows={5} cols={5} /> : (
          <TransactionTable transactions={stats?.recentTransactions?.slice(0, 5) || []} />
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
