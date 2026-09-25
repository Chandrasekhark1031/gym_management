import { useEffect, useState } from 'react';
import { QrCode, Phone, Building2, User, CreditCard } from 'lucide-react';
import { customerPortalService, assetUrl } from '../../services/gymService';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardBody } from '../../components/ui/Card';
import { LoadingState, ErrorState } from '../../components/ui/PageStates';

export default function CustomerGymPayment() {
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    customerPortalService.gymPayment()
      .then((res) => setGym(res.gym))
      .catch(() => setError('Unable to load payment details. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading gym payment info..." />;
  if (error) return <ErrorState message={error} />;
  if (!gym) return null;

  const displayQrUrl = gym.qrCodeUrl
    ? assetUrl(gym.qrCodeUrl)
    : gym.upiQrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(gym.upiQrPayload)}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Gym UPI / QR" description="Pay your gym offline using UPI" />

      <Card className="max-w-md">
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900">
            <Building2 size={18} className="text-blue-600" />
            <span className="font-semibold">{gym.name}</span>
          </div>

          {gym.bankCandidateName && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User size={16} className="text-gray-500" />
              <span className="text-gray-500">Candidate / Account Name:</span>
              <span className="font-medium text-gray-900">{gym.bankCandidateName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone size={16} />
            <span className="text-gray-500">Mobile:</span>
            <span className="font-medium text-gray-900">{gym.paymentPhone || gym.phone}</span>
          </div>

          <div className="text-sm flex items-center gap-2">
            <CreditCard size={16} className="text-gray-500" />
            <span className="text-gray-500">UPI ID: </span>
            <span className="font-medium text-gray-900">{gym.upiId || 'UPI ID not configured by gym owner.'}</span>
          </div>

          {displayQrUrl ? (
            <div className="pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <QrCode size={16} />
                <span>Scan to pay via UPI (confirm payment with your gym)</span>
              </div>
              <img src={displayQrUrl} alt="UPI QR Code for gym payment" className="border border-gray-200 rounded-lg mx-auto max-h-56 object-contain p-2 bg-white" />
            </div>
          ) : (
            <p className="text-sm text-gray-500">QR code is available when the gym owner configures it.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
