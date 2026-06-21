import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from 'lucide-react';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';

const typeConfig = {
  deposit: { label: 'Deposit', icon: ArrowDownToLine, color: 'text-green-500' },
  withdraw: { label: 'Withdrawal', icon: ArrowUpFromLine, color: 'text-red-500' },
  transfer_in: { label: 'Transfer In', icon: ArrowLeftRight, color: 'text-blue-500' },
  transfer_out: { label: 'Transfer Out', icon: ArrowLeftRight, color: 'text-orange-500' }
};

const amountClass = {
  deposit: 'text-green-600 dark:text-green-400',
  transfer_in: 'text-green-600 dark:text-green-400',
  withdraw: 'text-red-600 dark:text-red-400',
  transfer_out: 'text-red-600 dark:text-red-400'
};

const amountSign = { deposit: '+', transfer_in: '+', withdraw: '-', transfer_out: '-' };

const TransactionTable = ({ transactions = [], showAccount = false }) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-500">
        <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th className="table-th">Type</th>
            {showAccount && <th className="table-th">Account</th>}
            <th className="table-th">Description</th>
            <th className="table-th">Amount</th>
            <th className="table-th">Balance After</th>
            <th className="table-th">Status</th>
            <th className="table-th">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-banking-border bg-white dark:bg-banking-card">
          {transactions.map((tx) => {
            const cfg = typeConfig[tx.type] || {};
            const Icon = cfg.icon || ArrowLeftRight;
            return (
              <tr key={tx._id} className="table-row">
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg bg-gray-100 dark:bg-banking-darker flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{cfg.label || tx.type}</span>
                  </div>
                </td>
                {showAccount && (
                  <td className="table-td font-mono text-xs">
                    {tx.account?.accountNumber || '-'}
                  </td>
                )}
                <td className="table-td text-gray-500 dark:text-gray-400 max-w-[180px] truncate">
                  {tx.description || '-'}
                </td>
                <td className={`table-td font-semibold ${amountClass[tx.type] || ''}`}>
                  {amountSign[tx.type]}{formatCurrency(tx.amount)}
                </td>
                <td className="table-td font-mono text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(tx.balanceAfter)}
                </td>
                <td className="table-td">
                  <Badge value={tx.status} />
                </td>
                <td className="table-td text-gray-500 dark:text-gray-400 text-xs">
                  {formatDate(tx.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
