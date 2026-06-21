import React, { useEffect, useState } from 'react';
import { Users, CreditCard, ArrowLeftRight, ShieldCheck, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { dashboardAPI } from '../../api';
import StatsCard from '../../components/ui/StatsCard';
import VolumeChart from '../../components/charts/VolumeChart';
import TransactionTable from '../../components/charts/TransactionTable';
import { CardSkeleton, TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then((d) => setStats(d.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">System-wide banking overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Users" value={stats?.users?.total ?? 0}
              subtitle={stats?.users?.customers + ' customers, ' + stats?.users?.employees + ' employees'}
              icon={Users} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
            <StatsCard title="Total Accounts" value={stats?.accounts?.total ?? 0}
              subtitle={stats?.accounts?.pending + ' pending approval'}
              icon={CreditCard} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
            <StatsCard title="Total Transactions" value={stats?.transactions?.total ?? 0}
              subtitle="All time across system"
              icon={ArrowLeftRight} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400" />
            <StatsCard title="Pending KYC" value={stats?.kyc?.pending ?? 0}
              subtitle="Awaiting review"
              icon={ShieldCheck} iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600 dark:text-yellow-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Deposits" value={formatCurrency(stats?.transactions?.totalDeposits ?? 0)}
              icon={TrendingUp} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600" />
            <StatsCard title="Total Withdrawals" value={formatCurrency(stats?.transactions?.totalWithdrawals ?? 0)}
              icon={TrendingUp} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600" />
            <StatsCard title="Active Accounts" value={stats?.accounts?.active ?? 0}
              icon={CreditCard} iconBg="bg-teal-100 dark:bg-teal-900/30" iconColor="text-teal-600" />
            <StatsCard title="Pending Accounts" value={stats?.accounts?.pending ?? 0}
              icon={AlertCircle} iconBg="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-600" />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VolumeChart data={stats?.transactionVolume || []} title="7-Day Transaction Volume" />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">System Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Total Customers', value: stats?.users?.customers ?? 0 },
              { label: 'Total Employees', value: stats?.users?.employees ?? 0 },
              { label: 'Active Accounts', value: stats?.accounts?.active ?? 0 },
              { label: 'Pending Approvals', value: (stats?.accounts?.pending ?? 0) + (stats?.kyc?.pending ?? 0) },
              { label: 'Transfer Volume', value: formatCurrency(stats?.transactions?.totalTransferOut ?? 0) }
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-banking-border last:border-0">
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Transactions</h3>
        {loading ? <TableSkeleton rows={6} cols={6} /> : (
          <TransactionTable transactions={stats?.recentTransactions || []} showAccount />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
