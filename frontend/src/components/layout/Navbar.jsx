import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, Search, X } from 'lucide-react';
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

  useEffect(() => {
    notificationsAPI.getAll({ limit: 1 }).then((data) => {
      setUnread(data.data?.unreadCount || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const roleLabel = { admin: 'Admin Panel', employee: 'Employee Portal', customer: 'My Banking' };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-banking-card border-b border-gray-100 dark:border-banking-border flex-shrink-0">
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-field w-64 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSearchOpen(false); setSearch(''); }
              }}
            />
            <button onClick={() => { setSearchOpen(false); setSearch(''); }}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              {roleLabel[role] || 'Dashboard'}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSearchOpen((s) => !s)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-banking-border transition-colors"
        >
          <Search className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400 w-[18px] h-[18px]" />
        </button>

        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-banking-border transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="w-[18px] h-[18px] text-yellow-400" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-gray-500" />
          )}
        </button>

        <button
          onClick={() => navigate(notifPath)}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-banking-border transition-colors"
        >
          <Bell className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate(`/${role === 'customer' ? 'dashboard' : role}/profile`)}
          className="flex items-center gap-2 ml-1 hover:opacity-80 transition-opacity"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: user?.avatarColor || '#16a34a' }}
          >
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{user?.fullName}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
