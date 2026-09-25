import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gymService } from '../../services/gymService';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardBody } from '../../components/ui/Card';
import Badge, { membershipBadgeVariant, paymentBadgeVariant } from '../../components/ui/Badge';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select, PasswordInput } from '../../components/ui/Input';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/PageStates';
import { formatPaymentMethod, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/display';
import { formatMembershipOption } from '../../utils/membershipOptions';
import ProfilePhotoUpload from '../../components/ui/ProfilePhotoUpload';

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.show);
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    membershipId: '',
    amount: 0,
    paymentDate: todayInput(),
    paymentMethod: 'CASH',
    status: 'PAID',
    notes: '',
  });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'status'; next?: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [renewMembership, setRenewMembership] = useState<any | null>(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [deleteMembershipId, setDeleteMembershipId] = useState<string | null>(null);
  const [deleteMembershipLoading, setDeleteMembershipLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [customerRes, plansRes] = await Promise.all([
        gymService.customers.get(id),
        gymService.plans.list(),
      ]);
      setData(customerRes);
      setEdit(customerRes.customer);
      setPlans(plansRes.plans.filter((p: any) => p.isActive));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await gymService.customers.update(id!, edit);
      showToast('Customer updated successfully.', 'success');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const applyStatusChange = async () => {
    if (!confirm || confirm.type !== 'status' || !confirm.next) return;
    setConfirmLoading(true);
    try {
      await gymService.customers.updateStatus(id!, confirm.next);
      showToast(confirm.next === 'ACTIVE' ? 'Customer activated.' : 'Customer deactivated.', 'success');
      setConfirm(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Status update failed', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const applyDelete = async () => {
    setConfirmLoading(true);
    try {
      await gymService.customers.remove(id!);
      showToast('Customer deleted.', 'success');
      navigate('/customers');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  };

  const assignMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigning(true);
    try {
      await gymService.memberships.assign({ customerId: id, planId: assignPlanId });
      showToast('Membership assigned successfully.', 'success');
      setAssignOpen(false);
      setAssignPlanId('');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to assign membership', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const openRenew = (membership: any) => {
    setRenewMembership(membership);
    setRenewPlanId(membership.plan_id || membership.planId || '');
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

  const applyDeleteMembership = async () => {
    if (!deleteMembershipId) return;
    setDeleteMembershipLoading(true);
    try {
      await gymService.memberships.remove(deleteMembershipId);
      showToast('Membership deleted successfully.', 'success');
      setDeleteMembershipId(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete membership', 'error');
    } finally {
      setDeleteMembershipLoading(false);
    }
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gymService.payments.create({
        ...paymentForm,
        customerId: id,
        membershipId: paymentForm.membershipId || undefined,
        paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : undefined,
      });
      showToast('Payment recorded successfully.', 'success');
      setPaymentOpen(false);
      setPaymentForm({ membershipId: '', amount: 0, paymentDate: todayInput(), paymentMethod: 'CASH', status: 'PAID', notes: '' });
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gymService.customers.update(id!, { ...edit, password });
      showToast('Password updated.', 'success');
      setPasswordOpen(false);
      setPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Password update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading customer..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const activeMembership = data.memberships?.find((m: any) => (m.status || m.computed_status) === 'ACTIVE' || (m.status || m.computed_status) === 'EXPIRING_SOON');

  return (
    <div className="space-y-6">
      <Link to="/customers" className="text-sm text-blue-600 hover:underline">← Back to Customers</Link>

      <PageHeader
        title={edit.name || 'Customer'}
        description={`Phone: ${edit.phone}${edit.email ? ` · ${edit.email}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAssignOpen(true)}>Assign Membership</Button>
            <Button variant="secondary" onClick={() => activeMembership && openRenew(activeMembership)} disabled={!activeMembership}>Renew Membership</Button>
            <Button variant="secondary" onClick={() => setPaymentOpen(true)}>Add Payment</Button>
            <Button variant="secondary" onClick={() => setPasswordOpen(true)}>Change Password</Button>
            <Button
              variant="secondary"
              onClick={() => setConfirm({ type: 'status', next: edit.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
            >
              {edit.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="danger" onClick={() => setConfirm({ type: 'delete' })}>Delete</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <ProfilePhotoUpload
              photoUrl={edit.photoUrl}
              onUpload={(file) => gymService.customers.uploadPhoto(id!, file).then((r) => ({ photoUrl: r.customer.photoUrl }))}
              onPhotoUpdated={(url) => {
                setEdit({ ...edit, photoUrl: url });
                showToast('Photo updated.', 'success');
                load();
              }}
            />
            <div className="space-y-3 mt-4">
              <Input label="Full Name *" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
              <Input label="Phone *" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} required />
              <Input label="Email" type="email" value={edit.email || ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              <Input label="Address" value={edit.address || ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
              <Button loading={saving} onClick={save}>Save Customer</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Account status</dt><dd><Badge variant={edit.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>{edit.accountStatus}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email verified</dt><dd>{edit.emailVerified ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd>{edit.createdAt ? new Date(edit.createdAt).toLocaleDateString() : '-'}</dd></div>
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Membership</h2>
          {activeMembership ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500">Plan</p><p className="font-medium">{activeMembership.plan_name}</p></div>
              <div><p className="text-gray-500">Status</p><Badge variant={membershipBadgeVariant(activeMembership.status || activeMembership.computed_status)}>{(activeMembership.status || activeMembership.computed_status)?.replace('_', ' ')}</Badge></div>
              <div><p className="text-gray-500">Expiry</p><p>{new Date(activeMembership.end_date).toLocaleDateString()}</p></div>
              <div><p className="text-gray-500">Days remaining</p><p>{activeMembership.days_remaining ?? '-'}</p></div>
            </div>
          ) : (
            <EmptyState title="No active membership" description="Assign a plan to activate this customer's membership." />
          )}
        </CardBody>
      </Card>

      <Card className="overflow-x-auto">
        <CardBody className="p-0 sm:p-0">
          <h2 className="text-lg font-semibold text-gray-900 px-4 sm:px-5 pt-4 sm:pt-5 mb-2">Membership History</h2>
          {data.memberships?.length ? (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {['Plan', 'Start', 'End', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="p-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.memberships.map((m: any) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="p-3">{m.plan_name}</td>
                    <td className="p-3">{new Date(m.start_date).toLocaleDateString()}</td>
                    <td className="p-3">{new Date(m.end_date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => openRenew(m)}>Renew</button>
                        <button type="button" className="text-red-600 hover:underline font-medium" onClick={() => setDeleteMembershipId(m.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 pb-4"><EmptyState title="No membership history" /></div>
          )}
        </CardBody>
      </Card>

      <Card className="overflow-x-auto">
        <CardBody className="p-0 sm:p-0">
          <h2 className="text-lg font-semibold text-gray-900 px-4 sm:px-5 pt-4 sm:pt-5 mb-2">Payments</h2>
          {data.payments?.length ? (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {['Amount', 'Date', 'Method', 'Status', 'Membership', 'Notes'].map((h) => (
                    <th key={h} className="p-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="p-3 font-medium">{p.amount}</td>
                    <td className="p-3">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="p-3">{formatPaymentMethod(p.payment_method || p.paymentMethod)}</td>
                    <td className="p-3"><Badge variant={paymentBadgeVariant(p.status)}>{p.status}</Badge></td>
                    <td className="p-3 text-gray-600">{p.membership_plan_name || p.membershipPlanName || '-'}</td>
                    <td className="p-3 text-gray-600">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 pb-4"><EmptyState title="No payments yet" description="Record a payment using Add Payment." /></div>
          )}
        </CardBody>
      </Card>

      <Modal open={assignOpen} title="Assign Membership" onClose={() => setAssignOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button loading={assigning} disabled={!assignPlanId} type="submit" form="assign-membership-form">Assign</Button>
        </>
      }>
        <form id="assign-membership-form" onSubmit={assignMembership} className="space-y-3">
          <Select label="Plan *" value={assignPlanId} onChange={(e) => setAssignPlanId(e.target.value)} required>
            <option value="">Select plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.durationValue} {p.durationUnit}</option>)}
          </Select>
        </form>
      </Modal>

      <Modal open={paymentOpen} title="Add Payment" onClose={() => setPaymentOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Cancel</Button>
          <Button loading={saving} type="submit" form="customer-payment-form">Save Payment</Button>
        </>
      }>
        <form id="customer-payment-form" onSubmit={addPayment} className="space-y-3">
          <Select label="Membership (optional)" value={paymentForm.membershipId} onChange={(e) => setPaymentForm({ ...paymentForm, membershipId: e.target.value })}>
            <option value="">No linked membership</option>
            {(data.memberships || []).map((m: any) => {
              const opt = formatMembershipOption(m);
              return <option key={opt.id} value={opt.id}>{opt.label}</option>;
            })}
          </Select>
          <Input label="Amount *" type="number" min={0} step="0.01" value={paymentForm.amount || ''} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} required />
          <Input label="Payment date *" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} required />
          <Select label="Payment Method" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{formatPaymentMethod(m)}</option>)}
          </Select>
          <Select label="Status" value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
        </form>
      </Modal>

      <Modal open={passwordOpen} title="Change Password" onClose={() => setPasswordOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button loading={saving} type="submit" form="customer-password-form">Update Password</Button>
        </>
      }>
        <form id="customer-password-form" onSubmit={savePassword}>
          <PasswordInput label="New login password *" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        title="Delete customer"
        message="This will permanently remove the customer and related data. This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={applyDelete}
      />

      <ConfirmDialog
        open={confirm?.type === 'status'}
        title={confirm?.next === 'INACTIVE' ? 'Deactivate customer' : 'Activate customer'}
        message={confirm?.next === 'INACTIVE' ? 'The customer will not be able to sign in until reactivated.' : 'The customer will be able to sign in again.'}
        confirmLabel={confirm?.next === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        danger={confirm?.next === 'INACTIVE'}
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={applyStatusChange}
      />

      <Modal open={!!renewMembership} title="Renew Membership" onClose={() => setRenewMembership(null)} footer={
        <>
          <Button variant="secondary" onClick={() => setRenewMembership(null)}>Cancel</Button>
          <Button loading={renewing} disabled={!renewPlanId} type="submit" form="renew-membership-form">Renew</Button>
        </>
      }>
        <form id="renew-membership-form" onSubmit={submitRenew} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Customer: <span className="font-semibold text-gray-900">{edit.name}</span></p>
            <p className="text-sm text-gray-600">Current Expiry: <span className="font-medium text-gray-900">{renewMembership?.end_date ? new Date(renewMembership.end_date).toLocaleDateString() : '-'}</span></p>
          </div>
          <Select label="Select Plan for Renewal *" value={renewPlanId} onChange={(e) => setRenewPlanId(e.target.value)} required>
            <option value="">Select plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.durationValue} {p.durationUnit} (₹{p.price})</option>)}
          </Select>
          <p className="text-xs text-gray-500">
            Renewing extends the expiration date of this membership with the selected plan without creating duplicate entries.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteMembershipId}
        title="Delete membership"
        message="Are you sure you want to delete this membership record? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleteMembershipLoading}
        onCancel={() => setDeleteMembershipId(null)}
        onConfirm={applyDeleteMembership}
      />
    </div>
  );
}
