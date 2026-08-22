import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { employeesAPI } from '../api';
import { useAuth } from './AuthContext';

const EmployeeContext = createContext(null);

export const EmployeeProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (user?.role !== 'employee') { setProfile(null); return; }
    setLoading(true);
    employeesAPI.getMe()
      .then((d) => setProfile(d.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user?.role]);

  useEffect(() => { refresh(); }, [refresh]);

  const isAdmin = user?.role === 'admin';
  const hasPermission = (perm) => isAdmin || (profile?.permissions?.includes(perm) ?? false);
  const isBankHead = () => isAdmin || profile?.orgRole === 'bank_head';
  const isDepartmentHead = () => isAdmin || profile?.orgRole === 'department_head';
  const isManager = () => isAdmin || profile?.orgRole === 'manager';
  const hasDepartment = (code) => isAdmin || profile?.department?.code === code;

  const value = { profile, loading, hasPermission, isBankHead, isDepartmentHead, isManager, hasDepartment, refresh };
  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
};

export const useEmployee = () => {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployee must be used within EmployeeProvider');
  return ctx;
};
