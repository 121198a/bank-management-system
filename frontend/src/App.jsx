import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import LoadingScreen from './components/ui/LoadingScreen';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Customer pages
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerAccounts from './pages/customer/Accounts';
import CustomerDeposit from './pages/customer/Deposit';
import CustomerWithdraw from './pages/customer/Withdraw';
import CustomerTransfer from './pages/customer/Transfer';
import CustomerTransactions from './pages/customer/Transactions';
import CustomerKyc from './pages/customer/Kyc';
import CustomerProfile from './pages/customer/Profile';
import CustomerNotifications from './pages/customer/Notifications';
import CustomerLoans from './pages/customer/Loans';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminAccounts from './pages/admin/Accounts';
import AdminTransactions from './pages/admin/Transactions';
import AdminKyc from './pages/admin/Kyc';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminLoans from './pages/admin/Loans';

// Employee pages
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeAccounts from './pages/employee/Accounts';
import EmployeeKyc from './pages/employee/Kyc';
import EmployeeTransactions from './pages/employee/Transactions';
import EmployeeLoans from './pages/employee/Loans';
import EmployeeAuditLogs from './pages/employee/AuditLogs';

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'employee') return <Navigate to="/employee" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App = () => {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        }
      />

      {/* Customer routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <DashboardLayout role="customer" />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="accounts" element={<CustomerAccounts />} />
        <Route path="deposit" element={<CustomerDeposit />} />
        <Route path="withdraw" element={<CustomerWithdraw />} />
        <Route path="transfer" element={<CustomerTransfer />} />
        <Route path="transactions" element={<CustomerTransactions />} />
        <Route path="loans" element={<CustomerLoans />} />
        <Route path="kyc" element={<CustomerKyc />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="notifications" element={<CustomerNotifications />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="accounts" element={<AdminAccounts />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="loans" element={<AdminLoans />} />
        <Route path="kyc" element={<AdminKyc />} />
        <Route path="audit" element={<AdminAuditLogs />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="notifications" element={<CustomerNotifications />} />
      </Route>

      {/* Employee routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <DashboardLayout role="employee" />
          </ProtectedRoute>
        }
      >
        <Route index element={<EmployeeDashboard />} />
        <Route path="accounts" element={<EmployeeAccounts />} />
        <Route path="kyc" element={<EmployeeKyc />} />
        <Route path="transactions" element={<EmployeeTransactions />} />
        <Route path="loans" element={<EmployeeLoans />} />
        <Route path="audit" element={<EmployeeAuditLogs />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="notifications" element={<CustomerNotifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
