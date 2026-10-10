import { useEffect, useState } from 'react';
import { gymService } from '../../services/gymService';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/PageStates';

const emptyForm = { name: '', durationValue: 1, durationUnit: 'Months', price: 0, description: '' };

export default function Plans() {
  const showToast = useToastStore((s) => s.show);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gymService.plans.list();
      setPlans(res.plans);
    } catch {
      setError('Unable to load plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      durationValue: p.durationValue,
      durationUnit: p.durationUnit,
      price: p.price,
      description: p.description || '',
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await gymService.plans.update(editingId, form);
        showToast('Plan updated successfully.', 'success');
      } else {
        await gymService.plans.create(form);
        showToast('Plan added successfully.', 'success');
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (p: any) => {
    try {
      await gymService.plans.updateStatus(p.id, !p.isActive);
      showToast(p.isActive ? 'Plan deactivated.' : 'Plan activated.', 'success');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await gymService.plans.remove(deleteId);
      showToast('Plan deleted.', 'success');
      setDeleteId(null);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Plans" description="Create and manage membership plans" actions={<Button onClick={openCreate}>Add Plan</Button>} />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {loading ? (
        <LoadingState message="Loading plans..." />
      ) : plans.length === 0 ? (
        <EmptyState title="No plans found" description="Add your first membership plan to get started." />
      ) : (
        <div className="gym-plan-cards">
          {plans.map((p, i) => <article key={p.id} className={`gym-plan-card ${!p.isActive ? 'inactive' : ''}`}>
            <div className="flex justify-between items-center"><span className="gym-eyebrow">PLAN {String(i + 1).padStart(2, '0')}</span><Badge variant={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Available' : 'Paused'}</Badge></div>
            <h2>{p.name}</h2><span className="text-[11px] text-[#889879]">{p.durationValue} {Number(p.durationValue) === 1 ? p.durationUnit.replace(/s$/, '') : p.durationUnit} membership</span>
            <div className="price">{new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(p.price)}<small>/ plan</small></div>
            <p>{p.description || 'A consistent routine. A stronger you.'}</p>
            <div className="gym-plan-card-footer"><span>{p.customerCount ?? 0} memberships</span><span>Offline payments</span></div>
            <div className="gym-plan-actions"><Button variant="secondary" onClick={() => openEdit(p)}>Edit plan</Button><button type="button" className="text-[#6f895b]" onClick={() => toggleStatus(p)}>{p.isActive ? 'Pause' : 'Activate'}</button><button type="button" className="text-red-500 ml-auto" onClick={() => setDeleteId(p.id)}>Delete</button></div>
          </article>)}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Plan' : 'Add Plan'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} type="submit" form="plan-form">{editingId ? 'Update Plan' : 'Save Plan'}</Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={save} className="space-y-3">
          <Input label="Plan Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration *" type="number" min={1} value={form.durationValue} onChange={(e) => setForm({ ...form, durationValue: Number(e.target.value) })} required />
            <Select label="Unit *" value={form.durationUnit} onChange={(e) => setForm({ ...form, durationUnit: e.target.value })}>
              <option>Days</option><option>Months</option><option>Years</option>
            </Select>
          </div>
          <Input label="Price *" type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete plan"
        message="Customers on this plan may be affected. Are you sure you want to delete this plan?"
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
