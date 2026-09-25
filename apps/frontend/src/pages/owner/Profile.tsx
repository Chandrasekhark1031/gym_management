import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Upload, ImageIcon, QrCode } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { assetUrl } from '../../services/gymService';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/PageStates';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const [form, setForm] = useState({
    name: user?.name || '',
    address: user?.address || '',
    gymName: user?.gymName || '',
    upiId: user?.upiId || '',
    photoUrl: user?.photoUrl || '',
    bankCandidateName: user?.bankCandidateName || '',
    paymentPhone: user?.paymentPhone || '',
    qrCodeUrl: user?.qrCodeUrl || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await authService.uploadLogo(file);
      setForm((prev) => ({ ...prev, photoUrl: res.photoUrl }));
      setUser({ ...user!, photoUrl: res.photoUrl });
      showToast('Gym logo uploaded successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to upload logo', 'error');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const res = await authService.uploadQrCode(file);
      setForm((prev) => ({ ...prev, qrCodeUrl: res.qrCodeUrl }));
      setUser({ ...user!, qrCodeUrl: res.qrCodeUrl });
      showToast('QR code uploaded successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to upload QR code', 'error');
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authService.updateProfile(form);
      setUser({
        ...user!,
        name: response.user.name,
        address: response.user.address,
        gymName: response.user.gymName,
        upiId: response.user.upiId,
        photoUrl: response.user.photoUrl,
        bankCandidateName: response.user.bankCandidateName,
        paymentPhone: response.user.paymentPhone,
        qrCodeUrl: response.user.qrCodeUrl,
      });
      showToast('Profile updated successfully.', 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Manage your owner account and gym details" />

      {error && <ErrorState message={error} />}

      <form onSubmit={onSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <Input label="Owner Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" value={user?.email || ''} disabled />
            <Input label="Phone" value={user?.mobile || ''} disabled />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Gym Information</h2>
            <Input label="Gym Name" value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gym Logo</label>
              <div className="flex items-center gap-4">
                {form.photoUrl ? (
                  <img
                    src={assetUrl(form.photoUrl)}
                    alt="Gym Logo"
                    className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400">
                    <ImageIcon size={24} />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    loading={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="text-xs py-1.5"
                  >
                    <Upload size={14} className="mr-1.5" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, or WebP up to 5MB</p>
                </div>
              </div>
            </div>

            <Input label="Gym Logo URL" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} hint="Or paste direct image URL" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
            <Input label="UPI ID" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="yourname@upi" />
            <Input
              label="Candidate Name on Bank"
              value={form.bankCandidateName}
              onChange={(e) => setForm({ ...form, bankCandidateName: e.target.value })}
              placeholder="e.g. Account holder name"
            />
            <Input
              label="Mobile Number"
              value={form.paymentPhone}
              onChange={(e) => setForm({ ...form, paymentPhone: e.target.value })}
              placeholder="e.g. 9876543210"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
              <div className="flex items-center gap-4">
                {form.qrCodeUrl ? (
                  <img
                    src={assetUrl(form.qrCodeUrl)}
                    alt="Payment QR Code"
                    className="h-20 w-20 rounded-lg object-contain border border-gray-200 p-1 bg-white"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400">
                    <QrCode size={28} />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    ref={qrInputRef}
                    onChange={handleQrUpload}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    loading={uploadingQr}
                    onClick={() => qrInputRef.current?.click()}
                    className="text-xs py-1.5"
                  >
                    <Upload size={14} className="mr-1.5" />
                    Upload QR Code
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">Upload your UPI QR code image</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">Shown to customers for offline UPI/Bank payments.</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-600">Change password, email, or phone from security settings.</p>
            <dl className="text-sm space-y-1">
              <div><span className="text-gray-500">Email verified:</span> {user?.emailVerified ? 'Yes' : 'No'}</div>
              <div><span className="text-gray-500">Phone verified:</span> {user?.phoneVerified ? 'Yes' : 'No'}</div>
              <div><span className="text-gray-500">Last login:</span> {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</div>
            </dl>
            <Link to="/settings" className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              Change Password / Email / Phone
            </Link>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <Button type="submit" loading={loading}>Save Profile</Button>
        </div>
      </form>
    </div>
  );
}
