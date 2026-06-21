import React, { useEffect, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { accountsAPI, transactionsAPI } from '../../api';
import TransactionTable from '../../components/charts/TransactionTable';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const Transactions = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ type: '', from: '', to: '' });

  useEffect(() => {
    accountsAPI.getMyAccounts().then((d) => {
      const active = d.data.accounts.filter(a => a.status === 'active');
      setAccounts(active);
      if (active.length > 0) setSelectedAccount(active[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);
    const params = { page, limit: 10, ...(filters.type && { type: filters.type }), ...(filters.from && { from: filters.from }), ...(filters.to && { to: filters.to }) };
    transactionsAPI.getAccountTransactions(selectedAccount, params)
      .then((d) => { setTransactions(d.data.transactions); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [selectedAccount, page, filters]);

  const handleDownload = async () => {
    if (!selectedAccount) return;
    setDownloading(true);
    try {
      const acc = accounts.find(a => a._id === selectedAccount);
      const blob = await transactionsAPI.downloadStatement(selectedAccount, { from: filters.from || undefined, to: filters.to || undefined });
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'statement_' + (acc?.accountNumber || 'account') + '.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statement downloaded!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View and filter your transactions</p>
        </div>
        <Button variant="secondary" icon={Download} loading={downloading} onClick={handleDownload} disabled={!selectedAccount}>
          Download Statement
        </Button>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <Select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value); setPage(1); }}
            options={accounts.map(a => ({ value: a._id, label: a.accountNumber + ' — ' + a.accountType }))}
            containerClass="w-48" />
          <Select value={filters.type} onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}
            options={[{ value: '', label: 'All Types' }, { value: 'deposit', label: 'Deposit' }, { value: 'withdraw', label: 'Withdrawal' }, { value: 'transfer_in', label: 'Transfer In' }, { value: 'transfer_out', label: 'Transfer Out' }]}
            containerClass="w-44" />
          <Input type="date" value={filters.from} onChange={(e) => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1); }} containerClass="w-40" label="" />
          <Input type="date" value={filters.to} onChange={(e) => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1); }} containerClass="w-40" label="" />
          {(filters.type || filters.from || filters.to) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilters({ type: '', from: '', to: '' }); setPage(1); }}>Clear filters</Button>
          )}
        </div>

        {loading ? <TableSkeleton rows={8} cols={6} /> : (
          <>
            <TransactionTable transactions={transactions} />
            {meta.totalPages > 1 && (
              <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />
            )}
            {!loading && transactions.length > 0 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Showing {transactions.length} of {meta.total} transactions
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Transactions;
