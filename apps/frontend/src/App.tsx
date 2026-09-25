import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import Customers from './pages/owner/Customers';
import CustomerDetail from './pages/owner/CustomerDetail';
import Plans from './pages/owner/Plans';
import Memberships from './pages/owner/Memberships';
import Payments from './pages/owner/Payments';
import Notifications from './pages/owner/Notifications';
import Profile from './pages/owner/Profile';
import Settings from './pages/owner/Settings';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerMembership from './pages/customer/CustomerMembership';
import CustomerPayments from './pages/customer/CustomerPayments';
import CustomerNotifications from './pages/customer/CustomerNotifications';
import CustomerGymPayment from './pages/customer/CustomerGymPayment';
import Layout from './components/layout/Layout';
import { LoadingState } from './components/ui/PageStates';

export default function App() {
  const { user, isLoading, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading application..." />
      </div>
    );
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/owner/register" element={<Register />} />
          <Route path="/customer/login" element={<Login defaultRole="customer" />} />
          <Route path="/customer/register" element={<Navigate to="/customer/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : user.role === 'owner' ? (
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<OwnerDashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/customer/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <Route element={<Layout />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/profile" element={<CustomerProfile />} />
          <Route path="/customer/membership" element={<CustomerMembership />} />
          <Route path="/customer/payments" element={<CustomerPayments />} />
          <Route path="/customer/notifications" element={<CustomerNotifications />} />
          <Route path="/customer/gym-payment" element={<CustomerGymPayment />} />
          <Route path="/dashboard" element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/customer/dashboard" replace />} />
        </Route>
      )}
    </Routes>
  );
}
