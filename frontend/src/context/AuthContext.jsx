import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setAuthToken, getAuthToken } from '../api/axiosInstance';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);


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

 
  const scheduleRefresh = useCallback(() => {
    clearRefreshTimer();
    refreshTimerRef.current = setTimeout(() => {
      // eslint-disable-next-line no-use-before-define
      silentRefresh();
    }, 14 * 60 * 1000);
  }, []);

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
    silentRefresh().finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    return () => clearRefreshTimer();
    
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
      //
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
