import React, { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { transactionsAPI } from '../../api';
import TransactionTable from '../../components/charts/TransactionTable';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const EmployeeTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '', from: '', to: '' });

  const fetchTransactions = useCallback(() => {
    setLoading(true);
    const params = {
      page, limit: 15,
      ...(search && { search }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to })
    };
    transactionsAPI.listAll(params)
      .then((d) => { setTransactions(d.data.transactions); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const hasFilters = search || filters.type || filters.status || filters.from || filters.to;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Monitoring</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monitor and review all customer transactions</p>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-10" placeholder="Search transactions..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={filters.type} onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}
            options={[{ value: '', label: 'All Types' }, { value: 'deposit', label: 'Deposit' }, { value: 'withdraw', label: 'Withdrawal' }, { value: 'transfer_in', label: 'Transfer In' }, { value: 'transfer_out', label: 'Transfer Out' }]}
            containerClass="w-40" />
          <Select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            options={[{ value: '', label: 'All Status' }, { value: 'success', label: 'Success' }, { value: 'failed', label: 'Failed' }]}
            containerClass="w-36" />
          <Input type="date" value={filters.from} onChange={(e) => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1); }} containerClass="w-40" label="" />
          <Input type="date" value={filters.to} onChange={(e) => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1); }} containerClass="w-40" label="" />
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setFilters({ type: '', status: '', from: '', to: '' }); setSearch(''); setPage(1); }}>Clear</Button>}
        </div>

        {loading ? <TableSkeleton rows={10} cols={7} /> : (
          <>
            <TransactionTable transactions={transactions} showAccount />
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400">{meta.total ?? 0} transactions found</p>
              <Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeTransactions;
