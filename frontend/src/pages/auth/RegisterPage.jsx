import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import { authAPI } from '../../api/authAPI';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', address: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.fullName || form.fullName.length < 2) errs.fullName = 'Full name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password || form.password.length < 12) errs.password = 'Password must be at least 12 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Add at least one uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Add at least one number';
    else if (!/[^A-Za-z0-9]/.test(form.password)) errs.password = 'Add at least one special character';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.register({ fullName: form.fullName, email: form.email, password: form.password, phone: form.phone, address: form.address });
      toast.success('Account created successfully. Please sign in.');
      navigate('/login');
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  };

  const p = form.password;
  const strength = [p.length >= 12, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-banking-dark py-8 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[.85fr_1.15fr] gap-6 items-stretch min-h-[calc(100vh-4rem)]">
        <aside className="hidden lg:flex rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 p-10 flex-col justify-between text-white relative">
          <div className="absolute -right-24 -top-20 w-80 h-80 bg-primary-500/20 blur-3xl rounded-full" />
          <div className="relative"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center"><Building2 className="w-6 h-6" /></div><div><p className="font-bold text-lg">NexaBank</p><p className="text-xs text-slate-400">Bank Management System</p></div></div></div>
          <div className="relative max-w-md"><span className="inline-flex items-center gap-2 text-xs text-primary-300 bg-primary-400/10 border border-primary-400/20 px-3 py-1.5 rounded-full"><ShieldCheck className="w-4 h-4" /> Secure account onboarding</span><h1 className="text-4xl xl:text-5xl font-bold leading-tight mt-5">Open your digital banking account.</h1><p className="text-slate-300 mt-5 leading-7">Create your customer profile and get access to accounts, transfers, statements and transaction history.</p></div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} NexaBank · Local development</p>
        </aside>

        <main className="card p-6 sm:p-9 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
          <div className="lg:hidden flex items-center gap-3 mb-7"><div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div><div><p className="font-bold text-gray-900 dark:text-white">NexaBank</p><p className="text-xs text-gray-500">Bank Management System</p></div></div>
          <div className="mb-7"><p className="text-sm font-semibold text-primary-600 mb-2">Customer onboarding</p><h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Create your account</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fill in your details. You can complete KYC after registration.</p></div>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Full name" icon={User} placeholder="Abhishek Sharma" value={form.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" />
              <Input label="Email address" type="email" icon={Mail} placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
              <div><label className="input-label">Password</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type={showPassword ? 'text' : 'password'} className={`input-field pl-10 pr-11 ${errors.password ? 'border-red-400' : ''}`} placeholder="Minimum 12 characters" value={form.password} onChange={set('password')} autoComplete="new-password" /><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{p && <div className="mt-2"><div className="flex gap-1">{[1,2,3,4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength ? (strength < 2 ? 'bg-red-500' : strength < 4 ? 'bg-yellow-500' : 'bg-primary-500') : 'bg-gray-200 dark:bg-banking-border'}`} />)}</div><p className="text-xs text-gray-500 mt-1">{labels[strength]} password</p></div>}{errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}</div>
              <div><label className="input-label">Confirm password</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type={showConfirm ? 'text' : 'password'} className={`input-field pl-10 pr-11 ${errors.confirmPassword ? 'border-red-400' : ''}`} placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" /><button type="button" aria-label="Toggle confirmation password visibility" onClick={() => setShowConfirm(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>}</div>
              <Input label="Phone (optional)" icon={Phone} placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              <Input label="Address (optional)" icon={MapPin} placeholder="City, State" value={form.address} onChange={set('address')} autoComplete="street-address" />
            </div>
            <div className="pt-2"><Button type="submit" loading={loading} className="w-full !py-3.5">Create account <ArrowRight className="w-4 h-4" /></Button></div>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-banking-border text-center"><p className="text-sm text-gray-500 dark:text-gray-400">Already have an account? <Link to="/login" className="text-primary-600 font-bold hover:text-primary-700">Sign in</Link></p></div>
        </main>
      </div>
    </div>
  );
};
export default RegisterPage;
