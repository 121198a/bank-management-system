import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import LoadingScreen from './components/ui/LoadingScreen';

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Customer pages
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard'));
const CustomerAccounts = lazy(() => import('./pages/customer/Accounts'));
const CustomerDeposit = lazy(() => import('./pages/customer/Deposit'));
const CustomerWithdraw = lazy(() => import('./pages/customer/Withdraw'));
const CustomerTransfer = lazy(() => import('./pages/customer/Transfer'));
const CustomerTransactions = lazy(() => import('./pages/customer/Transactions'));
const CustomerKyc = lazy(() => import('./pages/customer/Kyc'));
const CustomerProfile = lazy(() => import('./pages/customer/Profile'));
const CustomerNotifications = lazy(() => import('./pages/customer/Notifications'));
const CustomerLoans = lazy(() => import('./pages/customer/Loans'));
const CustomerInsurance = lazy(() => import('./pages/customer/Insurance'));
const ServiceCenter = lazy(() => import('./pages/shared/ServiceCenter'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminAccounts = lazy(() => import('./pages/admin/Accounts'));
const AdminTransactions = lazy(() => import('./pages/admin/Transactions'));
const AdminKyc = lazy(() => import('./pages/admin/Kyc'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminLoans = lazy(() => import('./pages/admin/Loans'));

// Employee pages
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard'));
const EmployeeAccounts = lazy(() => import('./pages/employee/Accounts'));
const EmployeeKyc = lazy(() => import('./pages/employee/Kyc'));
const EmployeeTransactions = lazy(() => import('./pages/employee/Transactions'));
const EmployeeLoans = lazy(() => import('./pages/employee/Loans'));
const EmployeeAuditLogs = lazy(() => import('./pages/employee/AuditLogs'));
const EmployeeInsurance = lazy(() => import('./pages/employee/Insurance'));
const EmployeeCollections = lazy(() => import('./pages/employee/Collections'));
const EmployeeSales = lazy(() => import('./pages/employee/Sales'));
const EmployeeSecurity = lazy(() => import('./pages/employee/Security'));

const NotFound = lazy(() => import('./pages/public/NotFound'));

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
    <Suspense fallback={<LoadingScreen />}>
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
        <Route path="insurance" element={<CustomerInsurance />} />
        <Route path="kyc" element={<CustomerKyc />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="notifications" element={<CustomerNotifications />} />
        <Route path="services" element={<ServiceCenter />} />
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
        <Route path="insurance" element={<EmployeeInsurance />} />
        <Route path="collections" element={<EmployeeCollections />} />
        <Route path="sales" element={<EmployeeSales />} />
        <Route path="security" element={<EmployeeSecurity />} />
        <Route path="kyc" element={<AdminKyc />} />
        <Route path="audit" element={<AdminAuditLogs />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="notifications" element={<CustomerNotifications />} />
        <Route path="services" element={<ServiceCenter />} />
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
        <Route path="insurance" element={<EmployeeInsurance />} />
        <Route path="collections" element={<EmployeeCollections />} />
        <Route path="sales" element={<EmployeeSales />} />
        <Route path="security" element={<EmployeeSecurity />} />
        <Route path="audit" element={<EmployeeAuditLogs />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="notifications" element={<CustomerNotifications />} />
        <Route path="services" element={<ServiceCenter />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

export default App;
