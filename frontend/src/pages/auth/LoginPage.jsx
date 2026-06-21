import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const from = location.state?.from?.pathname || null;

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Always go through AuthContext.login() — never call the API directly
      // from a page. This keeps the access token (sessionStorage) and the
      // React user state perfectly in sync, which previously was not the
      // case and caused intermittent "access denied" errors.
      const user = await login(form.email, form.password);
      toast.success('Welcome back, ' + user.fullName + '!');
      const roleRedirect = { admin: '/admin', employee: '/employee', customer: '/dashboard' };
      navigate(from || roleRedirect[user.role] || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-xl">Bank Management System</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Secure Banking<br />at Your Fingertips
          </h2>
          <p className="text-primary-200 text-lg">
            Manage your finances with confidence using our enterprise-grade secure banking platform.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Uptime', value: '99.99%' },
              { label: 'Secured Transactions', value: '2M+' },
              { label: 'Active Users', value: '50K+' },
              { label: 'Bank Branches', value: '120+' }
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-4">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-primary-200 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-primary-300 text-sm">© {new Date().getFullYear()} Bank Management System. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-banking-dark">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Bank Management System</span>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h1>
            <p className="text-gray-500 dark:text-gray-400">Sign in to your account to continue</p>
          </div>
          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input label="Email Address" type="email" icon={Mail} placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={errors.email} autoComplete="email" />
              <div className="w-full">
                <label className="input-label">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input type={showPassword ? 'text' : 'password'}
                    className={'input-field pl-10 pr-10' + (errors.password ? ' border-red-400 focus:ring-red-400' : '')}
                    placeholder="••••••••" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
              </div>
              <div className="flex items-center justify-end">
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" loading={loading} className="w-full">Sign In</Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">Create account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
