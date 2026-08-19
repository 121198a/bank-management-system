import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, Search, X, ChevronDown, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../api';

const Navbar = ({ role }) => {
  const { toggleTheme, isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const notifPath = `/${role === 'customer' ? 'dashboard' : role}/notifications`;
  const roleLabel = { admin: 'Admin Console', employee: 'Employee Workspace', customer: 'My Banking' };

  useEffect(() => { notificationsAPI.getAll({ limit: 1 }).then((data) => setUnread(data.data?.unreadCount || 0)).catch(() => {}); }, []);
  useEffect(() => { if (searchOpen && searchRef.current) searchRef.current.focus(); }, [searchOpen]);

  return (
    <header className="h-[72px] flex items-center justify-between px-4 sm:px-6 bg-white/90 dark:bg-banking-card/95 backdrop-blur-xl border-b border-gray-100 dark:border-banking-border flex-shrink-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {searchOpen ? (
          <div className="flex items-center gap-2 animate-slide-in"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workspace..." className="input-field w-52 sm:w-72 py-2.5 pl-9" onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearch(''); } }} /></div><button aria-label="Close search" onClick={() => { setSearchOpen(false); setSearch(''); }}><X className="w-4 h-4 text-gray-400" /></button></div>
        ) : (
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{roleLabel[role] || 'Dashboard'}</h1><span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 rounded-full px-2 py-1"><ShieldCheck className="w-3 h-3" /> Secure</span></div><p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
        )}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button aria-label="Search" onClick={() => setSearchOpen((s) => !s)} className="icon-action"><Search className="w-[18px] h-[18px]" /></button>
        <button aria-label="Toggle theme" onClick={toggleTheme} className="icon-action">{isDark ? <Sun className="w-[18px] h-[18px] text-yellow-400" /> : <Moon className="w-[18px] h-[18px]" />}</button>
        <button aria-label="Notifications" onClick={() => navigate(notifPath)} className="icon-action relative"><Bell className="w-[18px] h-[18px]" />{unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-banking-card">{unread > 9 ? '9+' : unread}</span>}</button>
        <button onClick={() => navigate(`/${role === 'customer' ? 'dashboard' : role}/profile`)} className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-100 dark:border-banking-border hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">{user?.fullName?.charAt(0).toUpperCase()}</div>
          <div className="hidden md:block text-left max-w-32"><p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.fullName}</p><p className="text-[11px] text-gray-400 capitalize">{user?.role}</p></div><ChevronDown className="hidden md:block w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </header>
  );
};
export default Navbar;
