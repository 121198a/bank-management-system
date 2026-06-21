import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { accountsAPI, transactionsAPI } from '../../api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { formatCurrency, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const Transfer = () => {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ fromAccountId: '', toAccountNumber: '', amount: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    accountsAPI.getMyAccounts().then((d) => {
      const active = d.data.accounts.filter(a => a.status === 'active');
      setAccounts(active);
      if (active.length > 0) setForm(f => ({ ...f, fromAccountId: active[0]._id }));
    });
  }, []);

  const selectedAccount = accounts.find(a => a._id === form.fromAccountId);
  const insufficient = form.amount && selectedAccount && Number(form.amount) > selectedAccount.balance;

  const validate = () => {
    const errs = {};
    if (!form.fromAccountId) errs.fromAccountId = 'Select source account';
    if (!form.toAccountNumber || form.toAccountNumber.length !== 10) errs.toAccountNumber = 'Enter a valid 10-digit account number';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
    else if (insufficient) errs.amount = 'Insufficient balance';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await transactionsAPI.transfer({ fromAccountId: form.fromAccountId, toAccountNumber: form.toAccountNumber, amount: Number(form.amount), description: form.description });
      setSuccess(res.data);
      toast.success('Transfer successful!');
      setForm(f => ({ ...f, toAccountNumber: '', amount: '', description: '' }));
      accountsAPI.getMyAccounts().then(d => setAccounts(d.data.accounts.filter(a => a.status === 'active')));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fund Transfer</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Send money to any account</p>
      </div>

      {success && (
        <div className="card p-5 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-700 dark:text-green-400">Transfer Successful</p>
          </div>
          <p className="text-sm text-green-600 dark:text-green-500">
            {formatCurrency(success.transaction?.amount)} transferred. New balance: {formatCurrency(success.balance)}
          </p>
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select label="From Account" value={form.fromAccountId}
            onChange={(e) => setForm(f => ({ ...f, fromAccountId: e.target.value }))}
            error={errors.fromAccountId}
            options={accounts.map(a => ({ value: a._id, label: a.accountNumber + ' (' + formatCurrency(a.balance) + ')' }))} />
          {selectedAccount && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-banking-darker text-sm">
              <span className="text-gray-500 dark:text-gray-400">Available: </span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedAccount.balance)}</span>
            </div>
          )}
          <Input label="Recipient Account Number" placeholder="10-digit account number"
            value={form.toAccountNumber} maxLength={10}
            onChange={(e) => setForm(f => ({ ...f, toAccountNumber: e.target.value.replace(/\D/g, '') }))}
            error={errors.toAccountNumber} />
          <Input label="Amount (INR)" type="number" min="0.01" step="0.01"
            placeholder="0.00" value={form.amount}
            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            error={errors.amount} />
          {insufficient && (
            <div className="flex items-center gap-2 text-red-500 text-xs">
              <AlertTriangle className="w-4 h-4" /> Insufficient balance
            </div>
          )}
          <Input label="Description (optional)" placeholder="e.g. Rent payment"
            value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          <Button type="submit" loading={loading} icon={ArrowLeftRight} className="w-full" disabled={!!insufficient}>
            Transfer {form.amount ? formatCurrency(Number(form.amount)) : ''}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Transfer;
