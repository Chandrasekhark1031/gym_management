import { useEffect, useState } from 'react';
import { customerPortalService } from '../../services/gymService';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge, { paymentBadgeVariant } from '../../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/PageStates';
import { formatPaymentMethod } from '../../utils/display';

export default function CustomerPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    customerPortalService.payments()
      .then((res) => setPayments(res.payments))
      .catch(() => setError('Unable to load payments. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My Payments" description="View your payment history" />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {loading ? (
        <LoadingState message="Loading payments..." />
      ) : payments.length === 0 ? (
        <EmptyState title="No payments found" description="Payments recorded by your gym will appear here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {['Amount', 'Date', 'Method', 'Status', 'Notes'].map((h) => (
                  <th key={h} className="p-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="p-3 font-medium">{p.amount}</td>
                  <td className="p-3">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="p-3">{formatPaymentMethod(p.paymentMethod)}</td>
                  <td className="p-3"><Badge variant={paymentBadgeVariant(p.status)}>{p.status}</Badge></td>
                  <td className="p-3 text-gray-600">{p.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
