import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, History, ShieldCheck, User, Bell, LogOut, Sparkles,
  Users, ClipboardList, ChevronLeft, ChevronRight,
  Banknote, Building2, Umbrella, PhoneCall, TrendingUp, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEmployee } from '../../context/EmployeeContext';

const navConfig = {
  customer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/accounts', icon: CreditCard, label: 'My Accounts' },
    { to: '/dashboard/deposit', icon: ArrowDownToLine, label: 'Deposit' },
    { to: '/dashboard/withdraw', icon: ArrowUpFromLine, label: 'Withdraw' },
    { to: '/dashboard/transfer', icon: ArrowLeftRight, label: 'Transfer' },
    { to: '/dashboard/transactions', icon: History, label: 'Transactions' },
    { to: '/dashboard/loans', icon: Banknote, label: 'Loans' },
    { to: '/dashboard/insurance', icon: Umbrella, label: 'Insurance' },
    { to: '/dashboard/kyc', icon: ShieldCheck, label: 'KYC Verification' },
    { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { to: '/dashboard/profile', icon: User, label: 'Profile' },
    { to: '/dashboard/services', icon: Sparkles, label: 'Service Center' }
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/accounts', icon: CreditCard, label: 'Accounts' },
    { to: '/admin/transactions', icon: History, label: 'Transactions' },
    { to: '/admin/loans', icon: Banknote, label: 'Loans' },
    { to: '/admin/insurance', icon: Umbrella, label: 'Insurance' },
    { to: '/admin/collections', icon: PhoneCall, label: 'Collections' },
    { to: '/admin/sales', icon: TrendingUp, label: 'Sales' },
    { to: '/admin/security', icon: ShieldAlert, label: 'Security' },
    { to: '/admin/kyc', icon: ShieldCheck, label: 'KYC Management' },
    { to: '/admin/audit', icon: ClipboardList, label: 'Audit Logs' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/profile', icon: User, label: 'Profile' },
    { to: '/admin/services', icon: Sparkles, label: 'Service Center' }
  ]
};

// Base links every employee gets regardless of department (retail-banking
// duties, unchanged from before this phase).
const EMPLOYEE_BASE = [
  { to: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employee/accounts', icon: CreditCard, label: 'Account Approvals' },
  { to: '/employee/kyc', icon: ShieldCheck, label: 'KYC Review' },
  { to: '/employee/transactions', icon: History, label: 'Transactions' }
];

// Department-specific links, shown only when the employee's own department
// matches AND (for the loan link, which everyone already had) is unconditional.
const buildEmployeeNav = ({ hasDepartment, hasPermission }) => {
  const links = [...EMPLOYEE_BASE];
  links.push({ to: '/employee/loans', icon: Banknote, label: 'Loan Review' });
  if (hasDepartment('INSURANCE') && hasPermission('insurance.review')) links.push({ to: '/employee/insurance', icon: Umbrella, label: 'Insurance' });
  if (hasDepartment('COLLECTION') && hasPermission('collection.view')) links.push({ to: '/employee/collections', icon: PhoneCall, label: 'Collections' });
  if (hasDepartment('SALES') && hasPermission('sales.view')) links.push({ to: '/employee/sales', icon: TrendingUp, label: 'Sales' });
  if (hasDepartment('IT_SECURITY') && hasPermission('security.alert.view')) links.push({ to: '/employee/security', icon: ShieldAlert, label: 'Security' });
  links.push({ to: '/employee/audit', icon: ClipboardList, label: 'Audit Logs' });
  links.push({ to: '/employee/notifications', icon: Bell, label: 'Notifications' });
  links.push({ to: '/employee/profile', icon: User, label: 'Profile' });
  links.push({ to: '/employee/services', icon: Sparkles, label: 'Service Center' });
  return links;
};

const Sidebar = ({ role, mobileOpen = false, onMobileClose = () => {} }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const employeeCtx = useEmployee();
  const navigate = useNavigate();
  const location = useLocation();

  // Frontend nav-hiding is UX only — every route below is still enforced
  // server-side by authorize()/requirePermission(); hiding here never
  // substitutes for that (Section 27).
  const links = role === 'employee' ? buildEmployeeNav(employeeCtx) : (navConfig[role] || navConfig.customer);

  // Close the mobile drawer whenever the route changes (tapping a link) or
  // Escape is pressed — mirrors Modal.jsx's keyboard-close pattern.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs on route change, not on onMobileClose identity
  useEffect(() => { onMobileClose(); }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onMobileClose(); };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; };
  }, [mobileOpen, onMobileClose]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop — only rendered/interactive below lg, closes on tap */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col h-screen bg-white/95 dark:bg-banking-card/95 backdrop-blur-xl
          border-r border-gray-100 dark:border-banking-border transition-transform duration-300 flex-shrink-0
          w-72 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:transition-all
          ${collapsed ? 'lg:w-16' : 'lg:w-60'}
        `}
        aria-label="Main navigation"
      >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-banking-border bg-gradient-to-b from-primary-50/80 to-transparent dark:from-primary-950/30">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-600/20 animate-float-soft">
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
          type="button"
          onClick={handleLogout}
          className="sidebar-link-inactive w-full"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-red-500" />
          {!collapsed && <span className="text-red-500">Logout</span>}
        </button>
      </div>

      {/* Collapse toggle — desktop only, doesn't apply to the mobile overlay drawer */}
      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => setCollapsed((c) => !c)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-banking-card border border-gray-200 dark:border-banking-border items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-banking-border transition-colors"
        style={{ position: 'fixed', left: collapsed ? '52px' : '228px', top: '80px', zIndex: 50 }}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>
      </aside>
    </>
  );
};

export default Sidebar;
