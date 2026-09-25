import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardBody } from '../../components/ui/Card';
import { Input, PasswordInput } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/PageStates';

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.mobile || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Required';
    if (passwordForm.newPassword.length < 6) errs.newPassword = 'At least 6 characters';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setError('');
    try {
      const response = await authService.changePassword(passwordForm);
      showToast(response.message || 'Password updated.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = async () => {
    if (!newEmail || !newEmail.trim()) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authService.updateEmail(newEmail.trim());
      setUser({ ...user!, email: response.user.email, emailVerified: response.user.emailVerified });
      showToast(response.message || 'Email updated successfully.', 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const changePhone = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.changePhone(phone);
      setUser({ ...user!, mobile: response.user.phone, phoneVerified: response.user.phoneVerified });
      showToast(response.message || 'Phone updated.', 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change phone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Settings"
        description="Update password, email, and phone"
        actions={<Link to="/profile" className="text-sm text-blue-600 hover:underline">← Back to Profile</Link>}
      />

      {error && <ErrorState message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <form onSubmit={changePassword} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <PasswordInput label="Current Password *" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} error={passwordErrors.currentPassword} />
              <PasswordInput label="New Password *" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} error={passwordErrors.newPassword} />
              <PasswordInput label="Confirm New Password *" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} error={passwordErrors.confirmPassword} />
              <Button type="submit" loading={loading}>Update Password</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Change Email</h2>
            <Input
              label="New Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
            />
            <Button type="button" loading={loading} onClick={updateEmail}>
              Update Email
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Change Phone</h2>
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button type="button" loading={loading} onClick={changePhone}>Update Phone</Button>
            
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
