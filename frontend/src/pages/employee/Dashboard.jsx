import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ShieldCheck, Users, History } from 'lucide-react';
import { dashboardAPI } from '../../api';
import StatsCard from '../../components/ui/StatsCard';
import TransactionTable from '../../components/charts/TransactionTable';
import { CardSkeleton, TableSkeleton } from '../../components/skeletons/Skeletons';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then((d) => setStats(d.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {greeting}, {user?.fullName?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Employee Portal — Pending tasks overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Pending Accounts" value={stats?.pendingAccounts ?? 0}
            subtitle="Awaiting your approval" icon={CreditCard}
            iconBg="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-600" />
          <StatsCard title="Pending KYC" value={stats?.pendingKyc ?? 0}
            subtitle="Documents to review" icon={ShieldCheck}
            iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600" />
          <StatsCard title="Total Customers" value={stats?.totalCustomers ?? 0}
            subtitle="Registered users" icon={Users}
            iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600" />
          <StatsCard title="Recent Transactions" value={stats?.recentTransactions?.length ?? 0}
            subtitle="In last 10 transactions" icon={History}
            iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600" />
        </div>
      )}

      {/* Quick links for pending work */}
      {!loading && (stats?.pendingAccounts > 0 || stats?.pendingKyc > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats?.pendingAccounts > 0 && (
            <Link to="/employee/accounts"
              className="card p-5 border-l-4 border-orange-400 hover:shadow-card-hover transition-shadow">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {stats.pendingAccounts} Account{stats.pendingAccounts > 1 ? 's' : ''} Awaiting Approval
              </p>
              <p className="text-xs text-primary-600 mt-1 font-medium">Review now →</p>
            </Link>
          )}
          {stats?.pendingKyc > 0 && (
            <Link to="/employee/kyc"
              className="card p-5 border-l-4 border-yellow-400 hover:shadow-card-hover transition-shadow">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {stats.pendingKyc} KYC Request{stats.pendingKyc > 1 ? 's' : ''} Pending Review
              </p>
              <p className="text-xs text-primary-600 mt-1 font-medium">Review now →</p>
            </Link>
          )}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Transactions</h3>
          <Link to="/employee/transactions" className="text-xs text-primary-600 font-medium hover:underline">View all</Link>
        </div>
        {loading ? <TableSkeleton rows={5} cols={6} /> : (
          <TransactionTable transactions={stats?.recentTransactions || []} showAccount />
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
