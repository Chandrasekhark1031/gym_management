import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import AuthCard from '../../components/ui/AuthCard';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/PageStates';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim());
      setMessage(
        response.message ||
          'If this email is registered, a password reset link has been sent. Please check your inbox and click Change Password.'
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="Reset your account password"
      footer={
        <Link to="/login" className="text-sm text-blue-600 hover:underline">
          Back to Login
        </Link>
      }
    >
      {message && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 text-green-700 p-3 text-sm">
          <p>{message}</p>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Enter your registered email address and we will send you a link to reset your password.
        </p>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@example.com"
          required
        />
        <Button type="submit" className="w-full" loading={loading} disabled={!email.trim()}>
          Send Reset Link
        </Button>
      </form>
    </AuthCard>
  );
}
