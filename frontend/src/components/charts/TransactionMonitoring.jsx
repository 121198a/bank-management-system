import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Filter, History, Search, SlidersHorizontal, X } from 'lucide-react';
import { accountsAPI, transactionsAPI } from '../../api';
import TransactionTable from './TransactionTable';
import Pagination from '../ui/Pagination';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { TableSkeleton } from '../skeletons/Skeletons';
import { formatCurrency, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdrawal' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'reversed', label: 'Reversed' }
];

const getInitialFilters = () => ({ search: '', type: '', status: '', from: '', to: '' });

const TransactionMonitoring = ({ role = 'customer' }) => {
  const isCustomer = role === 'customer';
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(getInitialFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    if (!isCustomer) return;
    accountsAPI.getMyAccounts()
      .then((d) => {
        const active = (d.data?.accounts || []).filter((account) => account.status === 'active');
        setAccounts(active);
        setSelectedAccount((current) => current || active[0]?._id || '');
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [isCustomer]);

  const fetchTransactions = useCallback(() => {
    if (isCustomer && !selectedAccount) {
      setTransactions([]);
      setMeta({ total: 0, totalPages: 1 });
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = {
      page,
      limit: isCustomer ? 10 : 15,
      ...(filters.search && { search: filters.search.trim() }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to })
    };

    const request = isCustomer
      ? transactionsAPI.getAccountTransactions(selectedAccount, params)
      : transactionsAPI.listAll(params);

    request
      .then((d) => {
        setTransactions(d.data?.transactions || []);
        setMeta(d.meta || {});
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, isCustomer, page, selectedAccount]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const clearFilters = () => {
    setFilters(getInitialFilters());
    setPage(1);
  };

  const selectedAccountData = useMemo(
    () => accounts.find((account) => account._id === selectedAccount),
    [accounts, selectedAccount]
  );

  const handleDownload = async () => {
    if (!selectedAccount) return;
    setDownloading(true);
    try {
      const blob = await transactionsAPI.downloadStatement(selectedAccount, {
        from: filters.from || undefined,
        to: filters.to || undefined
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement_${selectedAccountData?.accountNumber || 'account'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statement downloaded successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const title = isCustomer ? 'Transaction History' : 'Transaction Monitoring';
  const subtitle = isCustomer
    ? 'View, search and filter your account activity'
    : role === 'employee'
      ? 'Monitor and review customer transactions across authorized accounts'
      : 'Monitor all transactions across the banking system';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <History className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="page-heading">{title}</h2>
              <p className="page-subtitle">{subtitle}</p>
            </div>
          </div>
        </div>

        {isCustomer && (
          <Button
            variant="secondary"
            icon={Download}
            loading={downloading}
            onClick={handleDownload}
            disabled={!selectedAccount}
          >
            Download Statement
          </Button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-banking-border flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Transaction filters</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Refine the transaction list using account, type, status or date.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={filtersOpen ? X : SlidersHorizontal}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? 'Hide' : 'Filters'}
          </Button>
        </div>

        {filtersOpen && (
          <div className="p-5 bg-gray-50/60 dark:bg-banking-darker/30">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-3 items-end">
              {isCustomer && (
                <Select
                  label="Account"
                  value={selectedAccount}
                  onChange={(e) => { setSelectedAccount(e.target.value); setPage(1); }}
                  options={[
                    { value: '', label: 'Select account' },
                    ...accounts.map((account) => ({
                      value: account._id,
                      label: `${account.accountNumber} — ${account.accountType}`
                    }))
                  ]}
                  containerClass="xl:col-span-2"
                />
              )}

              <Input
                label="Search"
                icon={Search}
                placeholder={isCustomer ? 'Search description...' : 'Search account or description...'}
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                containerClass={isCustomer ? 'xl:col-span-2' : 'xl:col-span-2'}
              />

              <Select
                label="Type"
                value={filters.type}
                onChange={(e) => updateFilter('type', e.target.value)}
                options={TYPE_OPTIONS}
              />

              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                options={STATUS_OPTIONS}
              />

              <Input label="From" type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
              <Input label="To" type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />

              <div className="xl:col-span-6 flex justify-end gap-2 pt-1">
                {(Object.values(filters).some(Boolean)) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} icon={X}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-banking-border">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Transactions</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {meta.total ?? 0} {meta.total === 1 ? 'transaction' : 'transactions'} found
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            {Object.values(filters).filter(Boolean).length} active filters
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <TableSkeleton rows={10} cols={isCustomer ? 6 : 7} />
          ) : (
            <>
              <TransactionTable transactions={transactions} showAccount={!isCustomer} />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <p className="text-xs text-gray-400">
                  {transactions.length > 0
                    ? `Showing ${transactions.length} of ${meta.total ?? transactions.length} transactions`
                    : 'No transactions match your filters'}
                </p>
                <Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>

      {isCustomer && selectedAccountData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Account</p>
            <p className="font-mono font-semibold text-gray-800 dark:text-white mt-1">{selectedAccountData.accountNumber}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Available Balance</p>
            <p className="font-semibold text-gray-800 dark:text-white mt-1">{formatCurrency(selectedAccountData.balance)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Account Type</p>
            <p className="font-semibold text-gray-800 dark:text-white mt-1 capitalize">{selectedAccountData.accountType}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionMonitoring;
