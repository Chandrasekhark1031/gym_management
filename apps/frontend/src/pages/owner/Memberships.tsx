import { useEffect, useState } from 'react';
import { gymService } from '../../services/gymService';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge, { membershipBadgeVariant } from '../../components/ui/Badge';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/PageStates';

export default function Memberships() {
  const showToast = useToastStore((s) => s.show);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renewMembership, setRenewMembership] = useState<any | null>(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ planId: '', startDate: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [res, plansRes] = await Promise.all([
        gymService.memberships.list(status ? { status } : undefined),
        gymService.plans.list(),
      ]);
      setMemberships(res.memberships);
      setPlans(plansRes.plans.filter((p: any) => p.isActive));
    } catch {
      setError('Unable to load memberships. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const openEdit = (m: any) => {
    setEditId(m.id);
    setEditForm({
      planId: m.planId,
      startDate: m.startDate ? new Date(m.startDate).toISOString().slice(0, 10) : '',
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSubmitting(true);
    try {
      await gymService.memberships.update(editId, {
        planId: editForm.planId || undefined,
        startDate: editForm.startDate || undefined,
      });
      showToast('Membership updated.', 'success');
      setEditId(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openRenew = (m: any) => {
    setRenewMembership(m);
    setRenewPlanId(m.planId || '');
  };

  const submitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewMembership) return;
    setRenewing(true);
    try {
      await gymService.memberships.renew(renewMembership.id, { planId: renewPlanId, mode: 'extend' });
      showToast('Membership renewed successfully.', 'success');
      setRenewMembership(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Renew failed', 'error');
    } finally {
      setRenewing(false);
    }
  };

  const applyDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await gymService.memberships.remove(deleteId);
      showToast('Membership deleted successfully.', 'success');
      setDeleteId(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete membership', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Memberships" description="Track active, expiring, and expired memberships" />

      <Card className="p-4 mb-4 max-w-xs">
        <Select label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All memberships</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRING_SOON">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
        </Select>
      </Card>

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {loading ? (
        <LoadingState message="Loading memberships..." />
      ) : memberships.length === 0 ? (
        <EmptyState title="No memberships found" description="Assign memberships from a customer profile or add a new customer." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {['Customer', 'Plan', 'Start Date', 'End Date', 'Days Remaining', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="p-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{m.customerName}</div>
                    <div className="text-xs text-gray-500">{m.customerPhone}</div>
                  </td>
                  <td className="p-3">{m.planName}</td>
                  <td className="p-3">{new Date(m.startDate).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(m.endDate).toLocaleDateString()}</td>
                  <td className="p-3">
                    {m.daysRemaining != null ? (
                      <span className={m.daysRemaining <= 7 && m.status !== 'EXPIRED' ? 'text-amber-700 font-medium' : ''}>
                        {m.daysRemaining} days
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3"><Badge variant={membershipBadgeVariant(m.status)}>{m.status?.replace('_', ' ')}</Badge></td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => openEdit(m)}>Edit</button>
                      <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => openRenew(m)}>Renew</button>
                      <button type="button" className="text-red-600 hover:underline font-medium" onClick={() => setDeleteId(m.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!editId} title="Update Membership" onClose={() => setEditId(null)} footer={
        <>
          <Button variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
          <Button loading={submitting} type="submit" form="membership-edit-form">Save</Button>
        </>
      }>
        <form id="membership-edit-form" onSubmit={saveEdit} className="space-y-3">
          <Select label="Plan" value={editForm.planId} onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}>
            <option value="">Keep current plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Start date" type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
          <p className="text-xs text-gray-500">End date is recalculated from the plan duration when plan or start date changes.</p>
        </form>
      </Modal>

      <Modal open={!!renewMembership} title="Renew Membership" onClose={() => setRenewMembership(null)} footer={
        <>
          <Button variant="secondary" onClick={() => setRenewMembership(null)}>Cancel</Button>
          <Button loading={renewing} disabled={!renewPlanId} type="submit" form="memberships-renew-form">Renew</Button>
        </>
      }>
        <form id="memberships-renew-form" onSubmit={submitRenew} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Customer: <span className="font-semibold text-gray-900">{renewMembership?.customerName}</span></p>
            <p className="text-sm text-gray-600">Current Expiry: <span className="font-medium text-gray-900">{renewMembership?.endDate ? new Date(renewMembership.endDate).toLocaleDateString() : '-'}</span></p>
          </div>
          <Select label="Select Plan for Renewal *" value={renewPlanId} onChange={(e) => setRenewPlanId(e.target.value)} required>
            <option value="">Select plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.durationValue} {p.durationUnit} (₹{p.price})</option>)}
          </Select>
          <p className="text-xs text-gray-500">
            Renewing extends the expiration date of this membership with the selected plan without adding duplicate rows.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete membership"
        message="Are you sure you want to delete this membership record? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={applyDelete}
      />
    </div>
  );
}
