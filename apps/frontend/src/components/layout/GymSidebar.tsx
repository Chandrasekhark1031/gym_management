import { NavLink } from 'react-router-dom';
import { Dumbbell, LayoutDashboard, Users, Layers3, CalendarDays, Wallet, Bell, Settings2, UserRound, QrCode, LogOut, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const ownerLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/customers', label: 'Members', icon: Users },
  { to: '/memberships', label: 'Memberships', icon: CalendarDays },
  { to: '/plans', label: 'Plans & pricing', icon: Layers3 },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];
const customerLinks = [
  { to: '/customer/dashboard', label: 'My overview', icon: LayoutDashboard },
  { to: '/customer/membership', label: 'My membership', icon: CalendarDays },
  { to: '/customer/payments', label: 'Payment history', icon: Wallet },
  { to: '/customer/gym-payment', label: 'UPI & payment', icon: QrCode },
  { to: '/customer/notifications', label: 'Notifications', icon: Bell },
];
export default function GymSidebar({ customer = false, onNavigate }: { customer?: boolean; onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();
  const sites = import.meta.env.VITE_SITES_MODE === 'true';
  const link = (to: string, label: string, Icon: typeof Users) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `gym-nav-link ${isActive ? 'active' : ''}`}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></NavLink>;
  return <aside className="gym-sidebar">
    <NavLink to={customer ? '/customer/dashboard' : '/dashboard'} className="gym-brand" onClick={onNavigate}><div className="gym-brand-mark"><Dumbbell size={25} strokeWidth={2.3} /></div><div><strong>FITBRO<span>®</span></strong><small>GYM MANAGEMENT</small></div></NavLink>
    <div className="gym-club"><div className="gym-club-icon"><Dumbbell size={16} /></div><div><strong>{user?.gymName || 'Your gym'}</strong><small>{customer ? 'Customer portal' : 'Owner workspace'}</small></div><span className="status-dot" /></div>
    <div className="gym-nav-label">{customer ? 'YOUR MEMBERSHIP' : 'WORKSPACE'}</div>
    <nav aria-label="Main navigation" className="gym-nav">{(customer ? customerLinks : ownerLinks).map(l => link(l.to, l.label, l.icon))}</nav>
    <div className="gym-sidebar-bottom">
      {!customer && <div className="gym-sidebar-tip"><div className="gym-tip-icon"><CalendarDays size={18} /></div><strong>Keep your community moving.</strong><p>A little follow-up goes a long way. Check renewals for this week.</p><NavLink onClick={onNavigate} to="/memberships?status=EXPIRING_SOON">View renewals <ArrowUpRight size={14} /></NavLink></div>}
      <nav aria-label="Account navigation" className="gym-nav">{link(customer ? '/customer/profile' : '/profile', 'My profile', UserRound)}{!customer && link('/settings', 'Settings', Settings2)}</nav>
      <div className="gym-sidebar-user"><div className="gym-user-avatar">{user?.name?.split(' ').map(n => n[0]).slice(0,2).join('')}</div><div><strong>{user?.name || 'Gym manager'}</strong><small>{sites ? customer ? 'Member preview' : 'Owner workspace' : 'Signed in'}</small></div><button type="button" onClick={logout} aria-label="Logout"><LogOut size={17} /></button></div>
    </div>
  </aside>;
}
