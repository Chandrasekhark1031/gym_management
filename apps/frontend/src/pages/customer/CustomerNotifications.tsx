import { useEffect, useState } from 'react';
import { customerPortalService } from '../../services/gymService';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/PageStates';

export default function CustomerNotifications() {
  const showToast = useToastStore((s) => s.show);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await customerPortalService.notifications();
      setNotifications(res.notifications);
    } catch {
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = async (id: string) => {
    try {
      await customerPortalService.markNotificationRead(id);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to mark as read', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Messages from your gym"
        actions={unread > 0 ? <Badge variant="info">{unread} unread</Badge> : undefined}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.isRead ? 'border-blue-200 ring-1 ring-blue-100' : ''}>
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{n.title}</h3>
                      <Badge variant={n.isRead ? 'neutral' : 'info'}>{n.isRead ? 'Read' : 'Unread'}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <Button variant="secondary" className="shrink-0" onClick={() => markRead(n.id)}>Mark as Read</Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
