import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Building2, CheckCircle } from 'lucide-react';
import { authAPI } from '../../api/authAPI';
import Button from '../../components/ui/Button';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [show, setShow] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Must contain a number';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.password);
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-banking-dark">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">Bank Management System</span>
        </div>
        <div className="card p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password Reset!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set new password</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Choose a strong password for your account.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                {[
                  { key: 'password', label: 'New Password', showKey: 'password' },
                  { key: 'confirmPassword', label: 'Confirm Password', showKey: 'confirm' }
                ].map(({ key, label, showKey }) => (
                  <div key={key}>
                    <label className="input-label">{label}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type={show[showKey] ? 'text' : 'password'}
                        className={'input-field pl-10 pr-10' + (errors[key] ? ' border-red-400' : '')}
                        placeholder="••••••••"
                        value={form[key]}
                        onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                      />
                      <button type="button" onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                        {show[showKey] ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    {errors[key] && <p className="mt-1.5 text-xs text-red-500">{errors[key]}</p>}
                  </div>
                ))}
                <Button type="submit" loading={loading} className="w-full">Reset Password</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
