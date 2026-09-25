import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Wallet } from 'lucide-react';
import { customerPortalService, assetUrl } from '../../services/gymService';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardBody } from '../../components/ui/Card';
import Badge, { membershipBadgeVariant, paymentBadgeVariant } from '../../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/PageStates';
import { formatPaymentMethod } from '../../utils/display';

export default function CustomerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    customerPortalService.dashboard()
      .then((res) => setData(res.dashboard))
      .catch(() => setError('Unable to load dashboard. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Welcome back, ${data.customer.name}`} />

      <Card>
        <CardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {data.customer.photoUrl ? (
            <img src={assetUrl(data.customer.photoUrl)} className="w-16 h-16 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100" aria-hidden />
          )}
          <div>
            <p className="text-lg font-semibold text-gray-900">{data.customer.name}</p>
            <p className="text-gray-600">{data.gym.name}</p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-blue-600" size={20} />
              <h2 className="font-semibold text-gray-900">Current Membership</h2>
            </div>
            {data.membership ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Plan</dt><dd className="font-medium">{data.membership.planName}</dd></div>
                <div className="flex justify-between items-center"><dt className="text-gray-500">Status</dt><dd><Badge variant={membershipBadgeVariant(data.membership.status)}>{data.membership.status?.replace('_', ' ')}</Badge></dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Start date</dt><dd>{new Date(data.membership.startDate).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Expiry date</dt><dd>{new Date(data.membership.endDate).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Days remaining</dt><dd className="font-medium">{data.membership.daysRemaining} days</dd></div>
              </dl>
            ) : (
              <EmptyState
                title="No Active Membership"
                description="Please contact your gym owner to activate a membership."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="text-blue-600" size={20} />
              <h2 className="font-semibold text-gray-900">Latest Payment</h2>
            </div>
            {data.latestPayment ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd className="font-medium">{data.latestPayment.amount}</dd></div>
                <div className="flex justify-between items-center"><dt className="text-gray-500">Status</dt><dd><Badge variant={paymentBadgeVariant(data.latestPayment.status)}>{data.latestPayment.status}</Badge></dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd>{new Date(data.latestPayment.paymentDate).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Method</dt><dd>{formatPaymentMethod(data.latestPayment.paymentMethod)}</dd></div>
              </dl>
            ) : (
              <EmptyState title="No payments yet" description="Your payment history will appear here." />
            )}
            <div className="mt-4 pt-4 border-t text-sm text-gray-600 flex items-start gap-2">
              <Calendar size={16} className="mt-0.5 shrink-0" />
              <div>
                <p>Gym phone: {data.gym.phone}</p>
                <p>UPI: {data.gym.upiId || 'Not set by gym'}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
