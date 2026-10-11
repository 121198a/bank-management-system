import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight, Banknote, Bell, Building2, CreditCard, FileCheck2,
  History, LockKeyhole, PhoneCall, ReceiptText, ShieldCheck, LifeBuoy,
  TrendingUp, Umbrella, WalletCards
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const customerServices = [
  { title: 'Accounts', description: 'View balances, account status and banking products.', to: '/dashboard/accounts', icon: CreditCard, tone: 'from-blue-500 to-cyan-500' },
  { title: 'Money Transfer', description: 'Move funds securely between supported accounts.', to: '/dashboard/transfer', icon: ArrowLeftRight, tone: 'from-emerald-500 to-teal-500' },
  { title: 'Deposits & Withdrawals', description: 'Manage cash movement with guided forms.', to: '/dashboard/deposit', icon: WalletCards, tone: 'from-violet-500 to-indigo-500' },
  { title: 'Transactions', description: 'Review your transaction history and activity.', to: '/dashboard/transactions', icon: History, tone: 'from-orange-500 to-amber-500' },
  { title: 'Loans', description: 'Review loan products and application status.', to: '/dashboard/loans', icon: Banknote, tone: 'from-fuchsia-500 to-pink-500' },
  { title: 'Insurance', description: 'Manage insurance policies and related services.', to: '/dashboard/insurance', icon: Umbrella, tone: 'from-sky-500 to-blue-600' },
  { title: 'KYC Verification', description: 'Complete identity verification and track status.', to: '/dashboard/kyc', icon: FileCheck2, tone: 'from-lime-500 to-green-600' },
  { title: 'Security & Profile', description: 'Manage your personal details and account activity.', to: '/dashboard/profile', icon: LockKeyhole, tone: 'from-slate-600 to-slate-900' },
  { title: 'Notifications', description: 'Review important banking alerts and messages.', to: '/dashboard/notifications', icon: Bell, tone: 'from-rose-500 to-red-500' }
];

const operationsServices = [
  { title: 'Account Operations', description: 'Review customer account requests and lifecycle activity.', suffix: 'accounts', icon: CreditCard, tone: 'from-blue-500 to-cyan-500' },
  { title: 'Transactions', description: 'Monitor and process operational transaction activity.', suffix: 'transactions', icon: ReceiptText, tone: 'from-emerald-500 to-teal-500' },
  { title: 'Loan Operations', description: 'Review loan applications and workflow status.', suffix: 'loans', icon: Banknote, tone: 'from-violet-500 to-indigo-500' },
  { title: 'KYC Operations', description: 'Review identity verification requests and compliance status.', suffix: 'kyc', icon: ShieldCheck, tone: 'from-amber-500 to-orange-500' },
  { title: 'Insurance', description: 'Manage policy and claim operations where authorized.', suffix: 'insurance', icon: Umbrella, tone: 'from-sky-500 to-blue-600' },
  { title: 'Collections', description: 'Track collection cases and recovery workflows.', suffix: 'collections', icon: PhoneCall, tone: 'from-orange-500 to-red-500' },
  { title: 'Sales', description: 'Manage leads and conversion activity within your scope.', suffix: 'sales', icon: TrendingUp, tone: 'from-teal-500 to-emerald-600' },
  { title: 'Security', description: 'Review security alerts and operational incidents.', suffix: 'security', icon: LockKeyhole, tone: 'from-slate-700 to-slate-950' },
  { title: 'Audit Logs', description: 'Trace security-sensitive and operational actions.', suffix: 'audit', icon: History, tone: 'from-fuchsia-500 to-purple-600' }
];

const ServiceCard = ({ service, base }) => {
  const Icon = service.icon;
  const to = service.to || `${base}/${service.suffix}`;
  return (
    <Link to={to} className="group premium-card surface-glow p-5 hover:-translate-y-1 focus-ring">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${service.tone} text-white flex items-center justify-center shadow-lg mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">{service.title}</h2>
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400 mt-1.5">{service.description}</p>
        </div>
        <span className="text-primary-700 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
      </div>
    </Link>
  );
};

const ServiceCenter = () => {
  const { user } = useAuth();
  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';
  const base = role === 'admin' ? '/admin' : '/employee';
  const services = isCustomer ? customerServices : operationsServices;

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow p-6 sm:p-8 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 shadow-sm dark:shadow-black/30">
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300">
              <LifeBuoy className="w-3.5 h-3.5 text-primary-700 dark:text-primary-300" /> Help and services
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-4">Service Center</h1>
            <p className="text-gray-600 dark:text-slate-300 mt-2 max-w-2xl">{isCustomer ? 'Apply for loans and insurance, complete identity verification and manage your account security.' : 'Review the applications, collections, verification requests and security events you are authorised to handle.'}</p>
          </div>
          <div className="rounded-2xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 px-5 py-4 min-w-[190px]">
            <p className="text-xs text-gray-600 dark:text-slate-400">Workspace</p>
            <p className="text-lg font-bold mt-1 capitalize">{role}</p>
            <p className="text-xs text-primary-700 dark:text-primary-300 mt-1 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Signed in</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((service) => <ServiceCard key={service.title} service={service} base={base} />)}
      </div>

      <section className="card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-primary-700 dark:text-primary-400" /></div>
          <div><p className="font-bold text-gray-900 dark:text-white">Access follows your role</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Access is still governed by the existing authentication, role, permission and organizational scope rules.</p></div>
        </div>
        <Link to={isCustomer ? '/dashboard/notifications' : `${base}/audit`} className="btn-secondary text-sm text-center">Review activity</Link>
      </section>
    </div>
  );
};

export default ServiceCenter;
