import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Search } from 'lucide-react';
import { gymService, assetUrl } from '../../services/gymService';
import { useGymStore } from '../../store/useGymStore';
import { useToastStore } from '../../store/useToastStore';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge, { membershipBadgeVariant } from '../../components/ui/Badge';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { Input, PasswordInput } from '../../components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/PageStates';
import ProfilePhotoUpload from '../../components/ui/ProfilePhotoUpload';

const filters = [
  { value: '', label: 'All Customers' },
  { value: 'ACTIVE', label: 'Active Membership' },
  { value: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { value: 'EXPIRED', label: 'Expired Membership' },
  { value: 'NO_ACTIVE_MEMBERSHIP', label: 'No Active Membership' },
  { value: 'ACTIVE_ACCOUNT', label: 'Active Account' },
  { value: 'INACTIVE_ACCOUNT', label: 'Inactive Account' },
];

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  currentPlan?: string;
  membershipStatus: string;
  expiryDate?: string;
  accountStatus: string;
};

type ConfirmState =
  | { type: 'delete'; customer: CustomerRow }
  | { type: 'status'; customer: CustomerRow; next: 'ACTIVE' | 'INACTIVE' }
  | null;

export default function Customers() {
  const navigate = useNavigate();
  const { refreshKey, triggerRefresh } = useGymStore();
  const showToast = useToastStore((s) => s.show);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [menuTarget, setMenuTarget] = useState<{ customer: CustomerRow; top: number; left: number } | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', password: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gymService.customers.list({ search, filter: filter || undefined });
      setCustomers(res.customers);
    } catch {
      setError('Unable to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, filter, refreshKey]);

  useEffect(() => {
    if (!menuTarget) return;
    const handleClose = () => setMenuTarget(null);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [menuTarget]);

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', address: '', password: '' });
    setEditCustomer(null);
  };

  const openEdit = async (c: CustomerRow) => {
    setMenuTarget(null);
    try {
      const res = await gymService.customers.get(c.id);
      setEditCustomer(c);
      setForm({
        name: res.customer.name,
        phone: res.customer.phone,
        email: res.customer.email || '',
        address: res.customer.address || '',
        password: '',
      });
      setShowForm(true);
    } catch {
      showToast('Unable to load customer for editing.', 'error');
    }
  };

  const saveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editCustomer) {
        await gymService.customers.update(editCustomer.id, {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          address: form.address || undefined,
          ...(form.password ? { password: form.password } : {}),
        });
        showToast('Customer updated successfully.', 'success');
        setShowForm(false);
        resetForm();
      } else {
        const res = await gymService.customers.create(form);
        setEditCustomer({
          id: res.customer.id,
          name: res.customer.name,
          phone: res.customer.phone,
          email: res.customer.email,
          photoUrl: res.customer.photoUrl,
          membershipStatus: res.customer.membershipStatus || 'NO_MEMBERSHIP',
          accountStatus: res.customer.accountStatus,
        });
        showToast('Customer added successfully. You can add a photo below.', 'success');
      }
      load();
      triggerRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const applyConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.type === 'delete') {
        await gymService.customers.remove(confirm.customer.id);
        showToast('Customer deleted.', 'success');
      } else {
        await gymService.customers.updateStatus(confirm.customer.id, confirm.next);
        showToast(confirm.next === 'ACTIVE' ? 'Customer activated.' : 'Customer deactivated.', 'success');
      }
      setConfirm(null);
      load();
      triggerRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleActionClick = (e: React.MouseEvent<HTMLButtonElement>, customer: CustomerRow) => {
    e.stopPropagation();
    if (menuTarget?.customer.id === customer.id) {
      setMenuTarget(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 175;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + 10 && rect.top > menuHeight;
    const top = openUpward ? Math.max(10, rect.top - menuHeight - 4) : rect.bottom + 4;
    const left = Math.max(10, Math.min(window.innerWidth - 186, rect.right - 176));
    setMenuTarget({ customer, top, left });
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer accounts, memberships, and payments"
        actions={<Button onClick={() => { resetForm(); setShowForm(true); }}>Add Customer</Button>}
      />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone"
              aria-label="Search customers"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter customers"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {filters.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </Card>

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {loading ? (
        <LoadingState message="Loading customers..." />
      ) : customers.length === 0 ? (
        <EmptyState title="No customers found" description="Try adjusting your search or add a new customer." />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {customers.map((c, index) => (
              <Card key={c.id} className="p-4">
                <div className="flex gap-3">
                  {c.photoUrl ? (
                    <img src={assetUrl(c.photoUrl)} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-sm text-gray-600">{c.phone}</p>
                        {c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
                      </div>
                      <button
                        type="button"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Actions for ${c.name}`}
                        aria-expanded={menuTarget?.customer.id === c.id}
                        onClick={(e) => handleActionClick(e, c)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant={membershipBadgeVariant(c.membershipStatus)}>{c.membershipStatus.replace(/_/g, ' ')}</Badge>
                      <Badge variant={c.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>{c.accountStatus}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {c.currentPlan || 'No plan'} · Expiry: {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '-'}
                    </p>
                    <Link to={`/customers/${c.id}`} className="text-sm text-blue-600 hover:underline mt-2 inline-block">View details</Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-x-auto hidden md:block min-h-[320px]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {['Photo', 'Name', 'Phone', 'Email', 'Plan', 'Membership', 'Expiry', 'Account', 'Actions'].map((h) => (
                    <th key={h} className="p-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3">{c.photoUrl ? <img src={assetUrl(c.photoUrl)} alt="" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-gray-100" />}</td>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3">{c.email || '-'}</td>
                    <td className="p-3">{c.currentPlan || '-'}</td>
                    <td className="p-3"><Badge variant={membershipBadgeVariant(c.membershipStatus)}>{c.membershipStatus.replace(/_/g, ' ')}</Badge></td>
                    <td className="p-3">{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '-'}</td>
                    <td className="p-3"><Badge variant={c.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>{c.accountStatus}</Badge></td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Actions for ${c.name}`}
                        aria-expanded={menuTarget?.customer.id === c.id}
                        onClick={(e) => handleActionClick(e, c)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Modal
        open={showForm}
        title={editCustomer ? 'Edit Customer' : 'Add Customer'}
        onClose={() => { setShowForm(false); resetForm(); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button loading={submitting} type="submit" form="customer-form">{editCustomer ? 'Update Customer' : 'Save Customer'}</Button>
          </>
        }
      >
        <form id="customer-form" className="space-y-3" onSubmit={saveCustomer}>
          <Input label="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <PasswordInput
            label={editCustomer ? 'New login password' : 'Login Password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint={editCustomer ? 'Leave blank to keep current password.' : 'Optional. Required for customer portal login.'}
          />
          {editCustomer?.id && (
            <ProfilePhotoUpload
              photoUrl={editCustomer.photoUrl}
              onUpload={(file) => gymService.customers.uploadPhoto(editCustomer.id, file).then((r) => ({ photoUrl: r.customer.photoUrl }))}
              onPhotoUpdated={(url) => {
                setEditCustomer({ ...editCustomer, photoUrl: url });
                showToast('Photo updated.', 'success');
                load();
              }}
            />
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        title="Delete customer"
        message="Customers with membership or payment history cannot be deleted. Otherwise this permanently removes the customer."
        confirmLabel="Delete"
        danger
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={applyConfirm}
      />

      <ConfirmDialog
        open={confirm?.type === 'status'}
        title={confirm && confirm.type === 'status' && confirm.next === 'INACTIVE' ? 'Deactivate customer' : 'Activate customer'}
        message={confirm && confirm.type === 'status' && confirm.next === 'INACTIVE' ? 'The customer will not be able to sign in until reactivated.' : 'The customer will be able to sign in again.'}
        confirmLabel={confirm && confirm.type === 'status' && confirm.next === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        danger={confirm?.type === 'status' && confirm.next === 'INACTIVE'}
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={applyConfirm}
      />

      {menuTarget && createPortal(
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            aria-label="Close menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuTarget(null);
            }}
          />
          <div
            style={{ top: `${menuTarget.top}px`, left: `${menuTarget.left}px` }}
            className="fixed z-50 w-44 rounded-md border border-gray-200 bg-white shadow-xl py-1 text-sm"
          >
            <button
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-gray-50 font-medium text-gray-700"
              onClick={() => {
                const id = menuTarget.customer.id;
                setMenuTarget(null);
                navigate(`/customers/${id}`);
              }}
            >
              View
            </button>
            <button
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-gray-50 font-medium text-gray-700"
              onClick={() => {
                const target = menuTarget.customer;
                setMenuTarget(null);
                openEdit(target);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-gray-50 font-medium text-gray-700"
              onClick={() => {
                const target = menuTarget.customer;
                setMenuTarget(null);
                setConfirm({
                  type: 'status',
                  customer: target,
                  next: target.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                });
              }}
            >
              {menuTarget.customer.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 font-medium"
              onClick={() => {
                const target = menuTarget.customer;
                setMenuTarget(null);
                setConfirm({ type: 'delete', customer: target });
              }}
            >
              Delete
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
