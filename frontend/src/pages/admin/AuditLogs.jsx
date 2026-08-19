import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { auditAPI } from '../../api';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import ManagementFilterBar from '../../components/ui/ManagementFilterBar';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const actionColors = {
  USER_LOGIN: 'badge-info',
  USER_REGISTERED: 'badge-success',
  USER_ROLE_UPDATED: 'badge-warning',
  USER_ACTIVATED: 'badge-success',
  USER_DEACTIVATED: 'badge-danger',
  DEPOSIT: 'badge-success',
  WITHDRAW: 'badge-warning',
  TRANSFER: 'badge-info',
  ACCOUNT_CREATED: 'badge-info',
  ACCOUNT_APPROVED: 'badge-success',
  ACCOUNT_STATUS_UPDATED: 'badge-warning',
  KYC_SUBMITTED: 'badge-info',
  KYC_APPROVED: 'badge-success',
  KYC_REJECTED: 'badge-danger',
  PROFILE_UPDATED: 'badge-gray',
  PASSWORD_RESET_REQUESTED: 'badge-warning',
  PASSWORD_RESET_COMPLETED: 'badge-success',
  STATEMENT_DOWNLOADED: 'badge-gray'
};

const AuditLogs = ({ role = 'admin' }) => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ targetType: '', from: '', to: '' });

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = {
      page, limit: 20,
      ...(search && { search }),
      ...(filters.targetType && { targetType: filters.targetType }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to })
    };
    auditAPI.listLogs(params)
      .then((d) => { setLogs(d.data.logs); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{role === 'employee' ? 'Review your recorded audit activity' : 'Complete record of all system actions'}</p>
      </div>

      <ManagementFilterBar
        search={search}
        onSearch={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by action or actor..."
      >
        <Select value={filters.targetType} onChange={(e) => { setFilters(f => ({ ...f, targetType: e.target.value })); setPage(1); }}
          options={[{ value: '', label: 'All Targets' }, { value: 'User', label: 'User' }, { value: 'Account', label: 'Account' }, { value: 'Transaction', label: 'Transaction' }, { value: 'KYCRequest', label: 'KYC' }, { value: 'LoanApplication', label: 'Loan' }]}
          containerClass="w-full sm:w-40 lg:w-40" />
        <Input type="date" value={filters.from} onChange={(e) => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1); }} containerClass="w-full sm:w-40 lg:w-40" label="From" />
        <Input type="date" value={filters.to} onChange={(e) => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1); }} containerClass="w-full sm:w-40 lg:w-40" label="To" />
      </ManagementFilterBar>
      <div className="card p-5">

        {loading ? <TableSkeleton rows={12} cols={5} /> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {['Actor', 'Action', 'Target', 'IP', 'Timestamp'].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-banking-border bg-white dark:bg-banking-card">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="table-td text-center py-12">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-400">No audit logs found</p>
                      </td>
                    </tr>
                  ) : logs.map((log) => (
                    <tr key={log._id} className="table-row">
                      <td className="table-td">
                        <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{log.actor?.fullName || 'System'}</p>
                        <p className="text-xs text-gray-400 capitalize">{log.actor?.role || ''}</p>
                      </td>
                      <td className="table-td">
                        <span className={'badge ' + (actionColors[log.action] || 'badge-gray')}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="table-td">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{log.targetType}</p>
                        {log.targetId && <p className="text-xs font-mono text-gray-400">{String(log.targetId).slice(-8)}</p>}
                      </td>
                      <td className="table-td font-mono text-xs text-gray-400">{log.ip || '—'}</td>
                      <td className="table-td text-xs text-gray-400">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400">{meta.total ?? 0} total log entries</p>
              <Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
