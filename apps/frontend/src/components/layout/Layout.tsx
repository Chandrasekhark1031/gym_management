import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, Bell, ChevronDown, ShieldCheck } from 'lucide-react';
import Sidebar from './Sidebar';
import WorkspaceTools from './WorkspaceTools';
import CustomerSidebar from './CustomerSidebar';
import { useAuthStore } from '../../store/useAuthStore';

export default function Layout() {
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const customer = user?.role === 'customer';
  const SidebarComponent = customer ? CustomerSidebar : Sidebar;
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { if (!mobileOpen) return; const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); }; document.addEventListener('keydown', handle); return () => document.removeEventListener('keydown', handle); }, [mobileOpen]);
  return <div className="gym-layout"><WorkspaceTools />
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div className="gym-desktop-sidebar"><SidebarComponent /></div>
    {mobileOpen && <div className="gym-mobile-drawer"><button type="button" className="gym-drawer-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /><div className="gym-drawer-panel"><button type="button" className="gym-close-menu" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={22} /></button><SidebarComponent onNavigate={() => setMobileOpen(false)} /></div></div>}
    <div className="gym-content-shell">
      <header className="gym-topbar">
        <button type="button" className="gym-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen}><Menu size={23} /></button>
        <div className="gym-breadcrumb"><span>Workspace</span><span>/</span><strong>{customer ? 'Customer portal' : location.pathname.split('/')[1]?.replace('dashboard', 'Overview').replace('customers', 'Members')}</strong></div>
        {!customer && <form className="gym-global-search" onSubmit={e => { e.preventDefault(); navigate(`/customers?q=${encodeURIComponent(search)}`); }}><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a member…" aria-label="Find a member" /><kbd>↵</kbd></form>}
        <div className="gym-topbar-actions">
          <Link to={customer ? '/customer/notifications' : '/notifications'} className="gym-notification-button" aria-label="Notifications"><Bell size={19} /></Link>
          <Link to={customer ? '/customer/profile' : '/profile'} className="gym-topbar-user" aria-label="My profile"><span className="gym-user-avatar">{user?.name?.split(' ').map(n => n[0]).slice(0,2).join('')}</span><ChevronDown size={15} /></Link>
        </div>
      </header>
      <main id="main-content" className="gym-main" tabIndex={-1}><Outlet /></main>
      <footer className="gym-footer"><span>FITBRO <span>·</span> A stronger gym, together.</span><span><ShieldCheck size={13} />Signed in</span></footer>
    </div>
  </div>;
}
