import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setAuthToken, getAuthToken } from '../api/axiosInstance';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

// AuthContext is the ONLY place in the app that should call setAuthToken().
// Pages (Login, Register, etc.) must call context methods (login(), logout())
// rather than calling authAPI / axiosInstance directly — this was the root
// cause of a serious bug where the token used by axios and the token tracked
// by React state could silently diverge, causing intermittent "access denied"
// errors after login, after a page refresh, or after the 14-minute silent
// refresh timer fired.

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Schedule the next silent refresh 1 minute before the 15-minute access
  // token expires, so the user is re-authenticated before they ever see a
  // 401 in normal use. The reactive 401-interceptor in axiosInstance.js is
  // a safety net for when this proactive timer is late or the tab was
  // asleep/backgrounded — both layers work together intentionally.
  const scheduleRefresh = useCallback(() => {
    clearRefreshTimer();
    refreshTimerRef.current = setTimeout(() => {
      // eslint-disable-next-line no-use-before-define
      silentRefresh();
    }, 14 * 60 * 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attempts to restore/refresh the session using the httpOnly refresh
  // cookie. Always keeps sessionStorage (via setAuthToken) and React state
  // in sync — this is the single place that does both together.
  const silentRefresh = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh');
      const { accessToken, user: refreshedUser } = res.data.data;

      setAuthToken(accessToken);
      if (mountedRef.current) setUser(refreshedUser);
      scheduleRefresh();
      return refreshedUser;
    } catch {
      setAuthToken(null);
      if (mountedRef.current) setUser(null);
      clearRefreshTimer();
      return null;
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    // On first mount, try to restore a session from the refresh cookie.
    // If the user has no valid cookie (first visit, or it expired), this
    // fails silently and we just show the login page — that's expected,
    // not an error state.
    silentRefresh().finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    return () => clearRefreshTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: loggedInUser } = res.data.data;

    setAuthToken(accessToken);
    setUser(loggedInUser);
    scheduleRefresh();

    return loggedInUser;
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network/server errors here — we clear local state regardless
      // so the user is never stuck "logged in" client-side when the server
      // call fails (e.g. they're already offline).
    }
    clearRefreshTimer();
    setAuthToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshTokens: silentRefresh,
    updateUser,
    hasToken: !!getAuthToken(),
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isEmployee: user?.role === 'employee',
    isCustomer: user?.role === 'customer'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
