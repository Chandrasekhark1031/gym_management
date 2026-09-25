import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CreditCard, AlertTriangle, CalendarX, Layers, Wallet, UserPlus, PlusCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { gymService } from '../../services/gymService';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { membershipBadgeVariant } from '../../components/ui/Badge';
import { LoadingState, ErrorState } from '../../components/ui/PageStates';

const statConfig = [
  { key: 'totalCustomers', label: 'Total Customers', icon: Users },
  { key: 'activeMemberships', label: 'Active Memberships', icon: CreditCard },
  { key: 'expiringWithin7Days', label: 'Expiring Soon', icon: AlertTriangle },
  { key: 'expiredMemberships', label: 'Expired Memberships', icon: CalendarX },
  { key: 'activePlans', label: 'Active Plans', icon: Layers },
  { key: 'totalPayments', label: 'Total Payments', icon: Wallet },
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      gymService.dashboard.stats(),
      gymService.dashboard.expiring(),
      gymService.dashboard.recentPayments(),
    ])
      .then(([s, e, p]) => {
        setStats(s.stats);
        setExpiring(e.memberships);
        setRecentPayments(p.payments);
      })
      .catch(() => setError('Unable to load dashboard. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Dashboard" description={`Welcome back, ${user?.name}`} actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/customers')}><UserPlus size={16} className="mr-2 inline" />Add Customer</Button>
          <Button variant="secondary" onClick={() => navigate('/plans')}><PlusCircle size={16} className="mr-2 inline" />Add Plan</Button>
          <Button variant="secondary" onClick={() => navigate('/memberships')}>Add Membership</Button>
          <Button onClick={() => navigate('/payments')}>Add Payment</Button>
        </>
      } />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {statConfig.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.[key] ?? 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-700"><Icon size={20} /></div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-gray-900 mb-3">Expiring Soon</h2>
            <div className="space-y-3">
              {expiring.map((m, idx) => (
                <div key={idx} className="border-t pt-3 first:border-t-0 first:pt-0 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.customerName}</p>
                      <p className="text-gray-500">{m.phone} · {m.planName}</p>
                    </div>
                    <Badge variant={membershipBadgeVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-gray-600 mt-1">Expires {new Date(m.expiryDate).toLocaleDateString()} · {m.daysRemaining} days left</p>
                </div>
              ))}
              {expiring.length === 0 && <p className="text-sm text-gray-500">No memberships expiring soon.</p>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-gray-900 mb-3">Recent Payments</h2>
            <div className="space-y-3">
              {recentPayments.map((p, idx) => (
                <div key={idx} className="border-t pt-3 first:border-t-0 first:pt-0 text-sm flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.customerName}</p>
                    <p className="text-gray-500">{new Date(p.paymentDate).toLocaleDateString()} · {p.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{p.amount}</p>
                    <p className="text-gray-500">{p.status}</p>
                  </div>
                </div>
              ))}
              {recentPayments.length === 0 && <p className="text-sm text-gray-500">No payments yet.</p>}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
