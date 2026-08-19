import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 flex items-stretch">
      <section className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 p-12 xl:p-16 flex-col justify-between text-white">
        <div className="absolute -top-32 -left-24 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none">NexaBank</p>
            <p className="text-xs text-slate-400 mt-1">Bank Management System</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 mb-6">
            <ShieldCheck className="w-4 h-4 text-primary-400" /> Secure digital banking workspace
          </div>
          <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
            Banking that feels <span className="text-primary-400">simple.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300 max-w-lg">
            Manage accounts, move money, review transactions and stay in control from one clean banking workspace.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 max-w-md">
            {['Secure authentication', 'Real-time account overview', 'Transaction history', 'Role-based access'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-primary-400 flex-shrink-0" /> {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between text-xs text-slate-500">
          <span>© {new Date().getFullYear()} NexaBank</span>
          <span>Local development environment</span>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-slate-50 dark:bg-banking-dark">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
            <div><p className="font-bold text-gray-900 dark:text-white">NexaBank</p><p className="text-xs text-gray-500">Bank Management System</p></div>
          </div>

          <div className="mb-7">
            <p className="text-sm font-semibold text-primary-600 mb-2">Welcome back</p>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Sign in to your account</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Enter your credentials to continue to your dashboard.</p>
          </div>

          <div className="card p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input label="Email address" type="email" icon={Mail} placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
              <div>
                <div className="flex items-center justify-between mb-1.5"><label className="input-label !mb-0">Password</label><Link to="/forgot-password" className="text-xs font-semibold text-primary-600 hover:text-primary-700">Forgot password?</Link></div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} className={`input-field pl-10 pr-11 ${errors.password ? 'border-red-400 focus:ring-red-400/20' : ''}`} placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
              </div>
              <Button type="submit" loading={loading} className="w-full !py-3.5">Sign in <ArrowRight className="w-4 h-4" /></Button>
            </form>
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-banking-border text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">New to NexaBank? <Link to="/register" className="text-primary-600 hover:text-primary-700 font-bold">Create an account</Link></p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-5">Your session is protected by secure authentication controls.</p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
