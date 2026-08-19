import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { accountsAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import ManagementFilterBar from '../../components/ui/ManagementFilterBar';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const AdminAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', accountType: '' });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'active', remarks: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 10, ...(search && { search }), ...(filters.status && { status: filters.status }), ...(filters.accountType && { accountType: filters.accountType }) };
    accountsAPI.listAccounts(params)
      .then((d) => { setAccounts(d.data.accounts); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const openModal = (type, acc) => {
    setSelectedAccount(acc);
    setModalType(type);
    const defaults = { pending: 'rejected', active: 'frozen', frozen: 'active', suspended: 'active' };
    setStatusForm({ status: defaults[acc.status] || 'closed', remarks: '' });
  };
  const closeModal = () => { setModalType(null); setSelectedAccount(null); };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await accountsAPI.approve(selectedAccount._id);
      toast.success('Account approved successfully');
      closeModal();
      fetchAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    setActionLoading(true);
    try {
      await accountsAPI.updateStatus(selectedAccount._id, statusForm.status, statusForm.remarks);
      toast.success('Account status updated');
      closeModal();
      fetchAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Management</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View and manage all customer accounts</p>
      </div>

      <ManagementFilterBar
        search={search}
        onSearch={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by account number or customer..."
      >
        <Select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          options={[{ value: '', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'active', label: 'Active' }, { value: 'rejected', label: 'Rejected' }, { value: 'frozen', label: 'Frozen' }, { value: 'suspended', label: 'Suspended' }, { value: 'closed', label: 'Closed' }]}
          containerClass="w-full sm:w-40 lg:w-40" />
        <Select value={filters.accountType} onChange={(e) => { setFilters(f => ({ ...f, accountType: e.target.value })); setPage(1); }}
          options={[{ value: '', label: 'All Types' }, { value: 'savings', label: 'Savings' }, { value: 'current', label: 'Current' }, { value: 'salary', label: 'Salary' }, { value: 'student', label: 'Student' }, { value: 'senior_citizen', label: 'Senior Citizen' }]}
          containerClass="w-full sm:w-40 lg:w-40" />
      </ManagementFilterBar>

      <div className="card p-5">
        {loading ? <TableSkeleton rows={8} cols={7} /> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {['Account No.', 'Customer', 'Type', 'Balance', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-banking-border bg-white dark:bg-banking-card">
                  {accounts.length === 0 ? (
                    <tr><td colSpan={7} className="table-td text-center py-10 text-gray-400">No accounts found</td></tr>
                  ) : accounts.map((acc) => (
                    <tr key={acc._id} className="table-row">
                      <td className="table-td font-mono text-xs">{acc.accountNumber}</td>
                      <td className="table-td">
                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{acc.user?.fullName}</p>
                        <p className="text-xs text-gray-400">{acc.user?.email}</p>
                      </td>
                      <td className="table-td"><Badge value={acc.accountType} /></td>
                      <td className="table-td font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(acc.balance)}</td>
                      <td className="table-td"><Badge value={acc.status} /></td>
                      <td className="table-td text-xs text-gray-400">{formatDate(acc.createdAt, { year: 'numeric', month: 'short', day: '2-digit' })}</td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          {acc.status === 'pending' && (
                            <button onClick={() => openModal('approve', acc)}
                              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {acc.status !== 'closed' && acc.status !== 'rejected' && (
                            <button onClick={() => openModal('status', acc)}
                              className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-500 transition-colors" title="Update Status">
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal isOpen={modalType === 'approve'} onClose={closeModal} title="Approve Account" size="sm">
        {selectedAccount && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Approve account <strong>{selectedAccount.accountNumber}</strong> for <strong>{selectedAccount.user?.fullName}</strong>?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button className="flex-1" loading={actionLoading} onClick={handleApprove}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={modalType === 'status'} onClose={closeModal} title="Update Account Status" size="sm">
        {selectedAccount && (
          <div className="space-y-4">
            <Select label="New Status" value={statusForm.status}
              onChange={(e) => setStatusForm(f => ({ ...f, status: e.target.value }))}
              options={(selectedAccount.status === 'pending'
                ? [{ value: 'rejected', label: 'Rejected' }]
                : selectedAccount.status === 'active'
                  ? [{ value: 'frozen', label: 'Frozen' }, { value: 'suspended', label: 'Suspended' }, { value: 'closed', label: 'Closed' }]
                  : selectedAccount.status === 'rejected' ? []
                  : [{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }])} />
            <Input label="Remarks (optional)" placeholder="Reason for status change"
              value={statusForm.remarks} onChange={(e) => setStatusForm(f => ({ ...f, remarks: e.target.value }))} />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button className="flex-1" loading={actionLoading} onClick={handleStatusUpdate}>Update</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminAccounts;
