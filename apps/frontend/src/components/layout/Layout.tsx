import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, Bell, ChevronDown, ArrowLeft, ShieldCheck, Eye } from 'lucide-react';
import Sidebar from './Sidebar';
import WorkspaceTools from './WorkspaceTools';
import CustomerSidebar from './CustomerSidebar';
import { useAuthStore } from '../../store/useAuthStore';
import { gymService } from '../../services/gymService';
import api from '../../services/api';
import Modal from '../ui/Modal';
import { useToastStore } from '../../store/useToastStore';

export default function Layout() {
  const { user, login } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToastStore(s => s.show);
  const customer = user?.role === 'customer';
  const sites = import.meta.env.VITE_SITES_MODE === 'true';
  const SidebarComponent = customer ? CustomerSidebar : Sidebar;
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { if (!mobileOpen) return; const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); }; document.addEventListener('keydown', handle); return () => document.removeEventListener('keydown', handle); }, [mobileOpen]);
  const openPreview = async () => { setBusy(true); try { const r = await gymService.customers.list(); setMembers(r.customers); setPreviewOpen(true); } catch { showToast('Unable to load customer previews.', 'error'); } finally { setBusy(false); } };
  const switchView = async (customerId: string | null) => { setBusy(true); try { const { data } = await api.post('/sites/preview', { customerId }); await login({ ...data.user, mobile: data.user.phone }, data.token); setPreviewOpen(false); navigate(customerId ? '/customer/dashboard' : '/dashboard'); } catch { showToast('Unable to switch view. Please try again.', 'error'); } finally { setBusy(false); } };
  return <div className="gym-layout"><WorkspaceTools />
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div className="gym-desktop-sidebar"><SidebarComponent /></div>
    {mobileOpen && <div className="gym-mobile-drawer"><button type="button" className="gym-drawer-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /><div className="gym-drawer-panel"><button type="button" className="gym-close-menu" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={22} /></button><SidebarComponent onNavigate={() => setMobileOpen(false)} /></div></div>}
    <div className="gym-content-shell">
      <header className="gym-topbar">
        <button type="button" className="gym-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen}><Menu size={23} /></button>
        <div className="gym-breadcrumb"><span>Workspace</span><span>/</span><strong>{customer ? 'Customer preview' : location.pathname.split('/')[1]?.replace('dashboard', 'Overview').replace('customers', 'Members')}</strong></div>
        {!customer && <form className="gym-global-search" onSubmit={e => { e.preventDefault(); navigate(`/customers?q=${encodeURIComponent(search)}`); }}><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a member…" aria-label="Find a member" /><kbd>↵</kbd></form>}
        <div className="gym-topbar-actions">
          {sites && <button type="button" disabled={busy} className="gym-view-button" onClick={() => customer ? switchView(null) : openPreview()}>{customer ? <ArrowLeft size={16} /> : <Eye size={16} />}<span>{customer ? 'Owner view' : 'Customer view'}</span></button>}
          <Link to={customer ? '/customer/notifications' : '/notifications'} className="gym-notification-button" aria-label="Notifications"><Bell size={19} /></Link>
          <Link to={customer ? '/customer/profile' : '/profile'} className="gym-topbar-user" aria-label="My profile"><span className="gym-user-avatar">{user?.name?.split(' ').map(n => n[0]).slice(0,2).join('')}</span><ChevronDown size={15} /></Link>
        </div>
      </header>
      {customer && sites && <div className="gym-preview-banner"><Eye size={15} /><span>Previewing {user?.name}'s portal. Changes are saved in this private workspace.</span></div>}
      <main id="main-content" className="gym-main" tabIndex={-1}><Outlet /></main>
      <footer className="gym-footer"><span>FITBRO <span>·</span> A stronger gym, together.</span><span><ShieldCheck size={13} />{sites ? 'Private workspace' : 'Gym management'}</span></footer>
    </div>
    <Modal open={previewOpen} title="Preview a customer portal" onClose={() => setPreviewOpen(false)}><p className="text-sm text-gray-500 mb-4">Choose a member to test their membership, payments and notifications.</p><div className="space-y-2">{members.map(m => <button type="button" key={m.id} disabled={busy} onClick={() => switchView(m.id)} className="flex items-center gap-3 w-full text-left rounded-xl border border-gray-200 p-3 hover:bg-green-50"><span className="gym-member-avatar">{m.name.split(' ').map((n: string) => n[0]).slice(0,2).join('')}</span><div className="min-w-0"><strong className="text-sm">{m.name}</strong><p className="text-xs text-gray-500">{m.currentPlan || 'No membership'}</p></div></button>)}</div></Modal>
  </div>;
}
