import { useEffect, useState } from 'react';
import { customerPortalService } from '../../services/gymService';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardBody } from '../../components/ui/Card';
import Badge, { membershipBadgeVariant } from '../../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/PageStates';

export default function CustomerMembership() {
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      customerPortalService.membership(),
      customerPortalService.membershipHistory(),
    ])
      .then(([c, h]) => {
        setCurrent(c.membership);
        setHistory(h.memberships);
      })
      .catch(() => setError('Unable to load membership. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading membership..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="My Membership" description="Current plan and membership history" />

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900 mb-4">Current Plan</h2>
          {current ? (
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-500">Plan</dt><dd className="font-medium">{current.planName}</dd></div>
              <div><dt className="text-gray-500">Status</dt><dd><Badge variant={membershipBadgeVariant(current.status)}>{current.status?.replace('_', ' ')}</Badge></dd></div>
              <div><dt className="text-gray-500">Start</dt><dd>{new Date(current.startDate).toLocaleDateString()}</dd></div>
              <div><dt className="text-gray-500">End</dt><dd>{new Date(current.endDate).toLocaleDateString()}</dd></div>
              <div><dt className="text-gray-500">Days remaining</dt><dd className="font-medium">{current.daysRemaining} days</dd></div>
            </dl>
          ) : (
            <EmptyState
              title="No Active Membership"
              description="Please contact your gym owner to activate a membership."
            />
          )}
        </CardBody>
      </Card>

      <Card className="overflow-x-auto">
        <CardBody className="p-0 sm:p-0">
          <h2 className="font-semibold text-gray-900 px-4 sm:px-5 pt-4 sm:pt-5 mb-2">Membership History</h2>
          {history.length === 0 ? (
            <div className="px-4 pb-4"><EmptyState title="No history yet" /></div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {['Plan', 'Start', 'End', 'Status'].map((h) => (
                    <th key={h} className="p-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="p-3">{m.planName}</td>
                    <td className="p-3">{new Date(m.startDate).toLocaleDateString()}</td>
                    <td className="p-3">{new Date(m.endDate).toLocaleDateString()}</td>
                    <td className="p-3"><Badge variant={membershipBadgeVariant(m.status)}>{m.status?.replace('_', ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
