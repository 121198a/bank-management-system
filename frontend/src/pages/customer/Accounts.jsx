import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, Download } from 'lucide-react';
import { accountsAPI, transactionsAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, formatDateOnly, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const CustomerAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ accountType: 'savings', initialDeposit: '' });
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchAccounts = () => {
    setLoading(true);
    accountsAPI.getMyAccounts()
      .then((d) => setAccounts(d.data.accounts))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await accountsAPI.create({ accountType: form.accountType, initialDeposit: form.initialDeposit || '0.00' });
      toast.success('Account application submitted! Awaiting approval.');
      setShowCreate(false);
      setForm({ accountType: 'savings', initialDeposit: '' });
      fetchAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadStatement = async (accountId, accountNumber) => {
    setDownloadingId(accountId);
    try {
      const blob = await transactionsAPI.downloadStatement(accountId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'statement_' + accountNumber + '.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statement downloaded!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Accounts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your bank accounts</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>New Account</Button>
      </div>

      {loading ? <TableSkeleton rows={4} cols={5} /> : accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No accounts yet</h3>
          <p className="text-gray-500 text-sm mb-4">Open your first bank account to get started</p>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>Open Account</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <div key={acc._id} className="card p-6 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <Badge value={acc.status} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">{acc.accountNumber}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(acc.balance)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mb-4">{acc.accountType} Account · {acc.currency}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Opened {formatDateOnly(acc.createdAt)}</span>
                {acc.status === 'active' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    loading={downloadingId === acc._id}
                    onClick={() => handleDownloadStatement(acc._id, acc.accountNumber)}
                  >
                    Statement
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Open New Account">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Account Type"
            value={form.accountType}
            onChange={(e) => setForm(f => ({ ...f, accountType: e.target.value }))}
            options={[{ value: 'savings', label: 'Savings Account' }, { value: 'current', label: 'Current Account' }]}
          />
          <Input
            label="Initial Deposit (optional)"
            type="number"
            min="0"
            placeholder="0.00"
            value={form.initialDeposit}
            onChange={(e) => setForm(f => ({ ...f, initialDeposit: e.target.value }))}
          />
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-400">
            Your account will be reviewed and activated by our team within 24 hours.
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating} className="flex-1">Submit Application</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerAccounts;
