import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { BRAND } from '../../config/brand';

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
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.fullName}!`);
      const roleRedirect = { admin: '/admin', employee: '/employee', customer: '/dashboard' };
      navigate(from || roleRedirect[user.role] || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-stretch">
      <aside aria-label="About this service" className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 p-12 xl:p-16 flex-col justify-between text-gray-900 dark:text-white">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-700 text-white flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none">{BRAND.name}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">{BRAND.descriptor}</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">Accounts, transfers, loans and insurance.</p>
          <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-slate-300 max-w-lg">
            Customers manage their own accounts. Staff handle requests, KYC and security events according to their role.
          </p>
        </div>

        <div className="relative z-10 flex items-end justify-between text-xs text-gray-600 dark:text-slate-400">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          {import.meta.env.DEV ? <span>Local development environment</span> : <span aria-hidden="true" />}
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-slate-50 dark:bg-banking-dark">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
            <div><p className="font-bold text-gray-900 dark:text-white">{BRAND.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{BRAND.descriptor}</p></div>
          </div>

          <div className="mb-7">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-400 mb-2">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Sign in to your account</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Enter your credentials to continue to your dashboard.</p>
          </div>

          <div className="card p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input label="Email address" type="email" icon={Mail} placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
              <div>
                <div className="flex items-center justify-between mb-1.5"><label className="input-label !mb-0">Password</label><Link to="/forgot-password" className="text-xs font-semibold text-primary-700 dark:text-primary-400 hover:text-primary-700">Forgot password?</Link></div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} className={`input-field pl-10 pr-11 ${errors.password ? 'border-red-400 focus:ring-red-400/20' : ''}`} placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)} className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>
              <Button type="submit" loading={loading} className="w-full !py-3.5">Sign in <ArrowRight className="w-4 h-4" /></Button>
            </form>
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-banking-border text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">New to {BRAND.name}? <Link to="/register" className="text-primary-700 dark:text-primary-400 hover:text-primary-700 font-bold">Create an account</Link></p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-5">Your session is protected by secure authentication controls. <Link to="/privacy" className="underline">Privacy</Link> · <Link to="/terms" className="underline">Terms</Link></p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
