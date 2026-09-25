import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { customerPortalService } from '../../services/gymService';
import AuthCard from '../../components/ui/AuthCard';
import Button from '../../components/ui/Button';
import { Input, PasswordInput } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/PageStates';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await customerPortalService.login({ identifier, password });
      await login({
        id: response.user.id,
        name: response.user.name,
        mobile: response.user.phone,
        email: response.user.email,
        role: 'customer',
        address: response.user.address,
        photoUrl: response.user.photoUrl,
      }, response.token);
      navigate('/customer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Customer Login"
      subtitle="Access your membership and payments"
      footer={
        <Link to="/login" className="text-sm text-gray-600 hover:underline block">Owner Login</Link>
      }
    >
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email or Phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter email or phone" required />
        <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
        <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
      </form>
    </AuthCard>
  );
}
