import { useEffect, useState } from 'react';
import { gymService } from '../../services/gymService';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge, { paymentBadgeVariant } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/PageStates';
import { formatPaymentMethod, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/display';
import { formatMembershipOption } from '../../utils/membershipOptions';

const todayInput = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  customerId: '',
  membershipId: '',
  amount: 0,
  paymentDate: todayInput(),
  paymentMethod: 'CASH',
  status: 'PAID',
  notes: '',
};

export default function Payments() {
  const showToast = useToastStore((s) => s.show);
  const [payments, setPayments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [membershipOptions, setMembershipOptions] = useState<{ id: string; label: string }[]>([]);
  const [editMembershipOptions, setEditMembershipOptions] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editForm, setEditForm] = useState({
    membershipId: '',
    amount: 0,
    paymentDate: todayInput(),
    paymentMethod: 'CASH',
    status: 'PAID',
    notes: '',
  });

  const loadMembershipsForCustomer = async (customerId: string) => {
    if (!customerId) return [];
    const res = await gymService.customers.get(customerId);
    return (res.memberships || []).map(formatMembershipOption);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, c] = await Promise.all([gymService.payments.list(), gymService.customers.list()]);
      setPayments(p.payments);
      setCustomers(c.customers);
    } catch {
      setError('Unable to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!form.customerId) {
      setMembershipOptions([]);
      setForm((f) => ({ ...f, membershipId: '' }));
      return;
    }
    loadMembershipsForCustomer(form.customerId)
      .then(setMembershipOptions)
      .catch(() => setMembershipOptions([]));
  }, [form.customerId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await gymService.payments.create({
        ...form,
        membershipId: form.membershipId || undefined,
        paymentDate: form.paymentDate ? new Date(form.paymentDate).toISOString() : undefined,
      });
      showToast('Payment added successfully.', 'success');
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = async (p: any) => {
    setEditId(p.id);
    setEditCustomerId(p.customerId);
    const options = await loadMembershipsForCustomer(p.customerId);
    setEditMembershipOptions(options);
    setEditForm({
      membershipId: p.membershipId || '',
      amount: p.amount,
      paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString().slice(0, 10) : todayInput(),
      paymentMethod: p.paymentMethod,
      status: p.status,
      notes: p.notes || '',
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSubmitting(true);
    try {
      await gymService.payments.update(editId, {
        ...editForm,
        membershipId: editForm.membershipId || null,
        paymentDate: editForm.paymentDate ? new Date(editForm.paymentDate).toISOString() : undefined,
      });
      showToast('Payment updated.', 'success');
      setEditId(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const visiblePayments = payments.filter(p => (!statusFilter || p.status === statusFilter) && (!search || p.customerName?.toLowerCase().includes(search.toLowerCase())));
  const currency = (v: number) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(v);
  const review = async (p: any, status: string) => { setReviewing(p.id); try { await gymService.payments.update(p.id, { ...p, status }); showToast(status === 'PAID' ? 'Payment confirmed.' : 'Payment marked failed.', 'success'); await load(); } catch(e: any) { showToast(e.response?.data?.message || 'Unable to review payment.', 'error'); } finally { setReviewing(''); } };
  const exportPayments = () => {
    const cell = (value: unknown) => { const text = String(value ?? ''); const safe = /^[=+@-]/.test(text) ? "'" + text : text; return '"' + safe.replace(/"/g, '""') + '"'; };
    const rows = [['Member', 'Amount INR', 'Date', 'Method', 'Status', 'Notes'], ...visiblePayments.map(p => [p.customerName, p.amount, p.paymentDate, p.paymentMethod, p.status, p.notes])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(',')).join('\r\n')], { type:'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'FitBro_Payments.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      <PageHeader title="Payments" description="Record and track customer payments" actions={<><Button variant="secondary" onClick={exportPayments}>Export CSV</Button><Button onClick={() => { setForm(emptyForm); setModalOpen(true); }}>Add Payment</Button></>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-5"><Card className="p-4"><p className="text-xs text-gray-500">Confirmed collection</p><p className="text-2xl font-bold mt-2">{currency(payments.filter(p=>p.status==='PAID').reduce((s,p)=>s+Number(p.amount),0))}</p></Card><Card className="p-4"><p className="text-xs text-gray-500">Awaiting review</p><p className="text-2xl font-bold mt-2">{payments.filter(p=>p.status==='PENDING').length}</p></Card><Card className="p-4"><p className="text-xs text-gray-500">Payment records</p><p className="text-2xl font-bold mt-2">{payments.length}</p></Card></div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5"><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search payments by member" placeholder="Search payments by member…" className="rounded-xl border border-gray-200 px-4 py-2 text-sm bg-white flex-1 min-w-0"/><select aria-label="Payment status filter" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm bg-white"><option value="">All statuses</option>{PAYMENT_STATUSES.map(s=><option key={s} value={s}>{s==='PENDING'?'Pending review':s}</option>)}</select></div>
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {loading ? (
        <LoadingState message="Loading payments..." />
      ) : visiblePayments.length === 0 ? (
        <EmptyState title="No payments found" description="Record a payment when a customer pays for their membership." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {['Customer', 'Membership', 'Amount', 'Date', 'Method', 'Status', 'Notes', 'Actions'].map((h) => (
                  <th key={h} className="p-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePayments.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium">{p.customerName}</td>
                  <td className="p-3 text-gray-600">{p.membershipPlanName || '-'}</td>
                  <td className="p-3 font-semibold">{currency(p.amount)}</td>
                  <td className="p-3">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="p-3">{formatPaymentMethod(p.paymentMethod)}</td>
                  <td className="p-3"><Badge variant={paymentBadgeVariant(p.status)}>{p.status}</Badge></td>
                  <td className="p-3 text-gray-600 max-w-[200px] truncate" title={p.notes || ''}>{p.notes || '-'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">{p.status === 'PENDING' && <><Button className="text-xs" disabled={reviewing === p.id} onClick={() => review(p,'PAID')}>Confirm</Button><button type="button" className="text-xs text-red-500 min-h-9" disabled={reviewing === p.id} onClick={() => review(p,'FAILED')}>Reject</button></>}<button type="button" className="text-[#588343] hover:underline min-h-9" onClick={() => openEdit(p)}>Edit</button></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} title="Add Payment" onClose={() => setModalOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button loading={submitting} type="submit" form="payment-create-form">Save Payment</Button>
        </>
      }>
        <form id="payment-create-form" onSubmit={create} className="space-y-3">
          <Select label="Customer *" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, membershipId: '' })} required>
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
          </Select>
          <Select
            label="Membership (optional)"
            value={form.membershipId}
            onChange={(e) => setForm({ ...form, membershipId: e.target.value })}
            disabled={!form.customerId}
          >
            <option value="">No linked membership</option>
            {membershipOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
          <Input label="Amount *" type="number" min={0} step="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
          <Input label="Payment date *" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
          <Select label="Payment Method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{formatPaymentMethod(m)}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional reference or note" />
        </form>
      </Modal>

      <Modal open={!!editId} title="Edit Payment" onClose={() => setEditId(null)} footer={
        <>
          <Button variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
          <Button loading={submitting} type="submit" form="payment-edit-form">Update</Button>
        </>
      }>
        <form id="payment-edit-form" onSubmit={saveEdit} className="space-y-3">
          <Input label="Customer" value={customers.find((c) => c.id === editCustomerId)?.name || ''} disabled />
          <Select label="Membership (optional)" value={editForm.membershipId} onChange={(e) => setEditForm({ ...editForm, membershipId: e.target.value })}>
            <option value="">No linked membership</option>
            {editMembershipOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
          <Input label="Amount *" type="number" min={0} step="0.01" value={editForm.amount || ''} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} required />
          <Input label="Payment date *" type="date" value={editForm.paymentDate} onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })} required />
          <Select label="Payment Method" value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{formatPaymentMethod(m)}</option>)}
          </Select>
          <Select label="Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
