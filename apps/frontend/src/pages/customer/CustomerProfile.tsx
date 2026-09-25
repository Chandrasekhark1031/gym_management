import { useEffect, useState } from 'react';
import { customerPortalService } from '../../services/gymService';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Input, PasswordInput } from '../../components/ui/Input';
import { LoadingState, ErrorState } from '../../components/ui/PageStates';
import ProfilePhotoUpload from '../../components/ui/ProfilePhotoUpload';

export default function CustomerProfile() {
  const { setUser, user } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    customerPortalService.profile()
      .then((res) => setProfile(res.profile))
      .catch(() => setError('Unable to load profile. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await customerPortalService.updateProfile({
        name: profile.name,
        address: profile.address,
        photoUrl: profile.photoUrl,
      });
      setProfile(res.profile);
      setUser({ ...user!, name: res.profile.name, address: res.profile.address, photoUrl: res.profile.photoUrl });
      showToast('Profile updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Required';
    if (passwordForm.newPassword.length < 6) errs.newPassword = 'At least 6 characters';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const res = await customerPortalService.changePassword(passwordForm);
      showToast(res.message || 'Password updated.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Password change failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading profile..." />;
  if (error) return <ErrorState message={error} />;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Update your personal information and password" />

      <Card>
        <CardBody>
          <form onSubmit={save} className="space-y-4 max-w-lg">
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
            <ProfilePhotoUpload
              photoUrl={profile.photoUrl}
              onUpload={(file) => customerPortalService.uploadPhoto(file).then((r) => ({ photoUrl: r.profile.photoUrl }))}
              onPhotoUpdated={(url) => {
                setProfile({ ...profile, photoUrl: url });
                setUser({ ...user!, photoUrl: url });
                showToast('Photo updated successfully.', 'success');
              }}
            />
            <Input label="Full Name *" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            <Input label="Phone" value={profile.phone} disabled />
            <Input label="Email" type="email" value={profile.email || ''} disabled />
            <Input label="Address" value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Account status:</span>
              <Badge variant={profile.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>{profile.accountStatus}</Badge>
            </div>
            <Button type="submit" loading={saving}>Save Profile</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <form onSubmit={changePassword} className="space-y-4 max-w-lg">
            <h2 className="font-semibold text-gray-900">Change Password</h2>
            <PasswordInput label="Current password *" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} error={passwordErrors.currentPassword} />
            <PasswordInput label="New password *" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} error={passwordErrors.newPassword} />
            <PasswordInput label="Confirm password *" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} error={passwordErrors.confirmPassword} />
            <Button type="submit" loading={saving}>Update Password</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
