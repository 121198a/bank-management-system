import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, History, ShieldCheck, User, Bell, LogOut,
  Users, FileText, ClipboardList, ChevronLeft, ChevronRight,
  Banknote, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navConfig = {
  customer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/accounts', icon: CreditCard, label: 'My Accounts' },
    { to: '/dashboard/deposit', icon: ArrowDownToLine, label: 'Deposit' },
    { to: '/dashboard/withdraw', icon: ArrowUpFromLine, label: 'Withdraw' },
    { to: '/dashboard/transfer', icon: ArrowLeftRight, label: 'Transfer' },
    { to: '/dashboard/transactions', icon: History, label: 'Transactions' },
    { to: '/dashboard/loans', icon: Banknote, label: 'Loans' },
    { to: '/dashboard/kyc', icon: ShieldCheck, label: 'KYC Verification' },
    { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { to: '/dashboard/profile', icon: User, label: 'Profile' }
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/accounts', icon: CreditCard, label: 'Accounts' },
    { to: '/admin/transactions', icon: History, label: 'Transactions' },
    { to: '/admin/loans', icon: Banknote, label: 'Loans' },
    { to: '/admin/kyc', icon: ShieldCheck, label: 'KYC Management' },
    { to: '/admin/audit', icon: ClipboardList, label: 'Audit Logs' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/profile', icon: User, label: 'Profile' }
  ],
  employee: [
    { to: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/accounts', icon: CreditCard, label: 'Account Approvals' },
    { to: '/employee/kyc', icon: ShieldCheck, label: 'KYC Review' },
    { to: '/employee/transactions', icon: History, label: 'Transactions' },
    { to: '/employee/loans', icon: Banknote, label: 'Loan Review' },
    { to: '/employee/audit', icon: ClipboardList, label: 'Audit Logs' },
    { to: '/employee/notifications', icon: Bell, label: 'Notifications' },
    { to: '/employee/profile', icon: User, label: 'Profile' }
  ]
};

const Sidebar = ({ role }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const links = navConfig[role] || navConfig.customer;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={`relative flex flex-col h-screen bg-white dark:bg-banking-card border-r border-gray-100 dark:border-banking-border transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-banking-border bg-gradient-to-b from-primary-50/70 to-transparent dark:from-primary-950/30">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-600/20">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">NexaBank</p>
            <p className="text-[11px] text-primary-600 font-semibold mt-1">Bank Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-3 pt-4 pb-2">{!collapsed && <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-gray-400 dark:text-gray-500 px-2">Workspace</p>}</div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard' || to === '/admin' || to === '/employee'}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active shadow-md shadow-primary-600/15' : 'sidebar-link-inactive'
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-gray-100 dark:border-banking-border p-2 bg-slate-50/70 dark:bg-banking-darker/40">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-link-inactive w-full"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-red-500" />
          {!collapsed && <span className="text-red-500">Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-banking-card border border-gray-200 dark:border-banking-border flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-banking-border transition-colors"
        style={{ position: 'fixed', left: collapsed ? '52px' : '228px', top: '80px', zIndex: 50 }}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;
