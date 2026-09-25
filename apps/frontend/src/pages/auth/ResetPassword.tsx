import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import AuthCard from '../../components/ui/AuthCard';
import Button from '../../components/ui/Button';
import { PasswordInput } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/PageStates';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const resetToken = tokenFromUrl || sessionStorage.getItem('password_reset_token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!resetToken) {
      setError('Invalid or expired reset link. Please request a new password reset link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.resetPassword({ resetToken, password, confirmPassword });
      sessionStorage.removeItem('password_reset_token');
      setMessage(response.message || 'Password reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Choose a new password"
      footer={
        <Link to="/login" className="text-sm text-blue-600 hover:underline">
          Back to Login
        </Link>
      }
    >
      {message && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 text-green-700 p-3 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}
      {!resetToken && !message && (
        <div className="mb-4">
          <ErrorState message="No reset token found. Please use the Change Password link sent to your email." />
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordInput
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
          required
        />
        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
        />
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={!password || !confirmPassword || !resetToken}
        >
          Reset Password
        </Button>
      </form>
    </AuthCard>
  );
}
