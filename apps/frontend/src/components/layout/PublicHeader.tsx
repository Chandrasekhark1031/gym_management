import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, ChevronDown, Menu, X, UserRound, Users, Plus, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const navigation = [
  { to: '/#features', label: 'Features' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/#portals', label: 'For your gym' },
];
export default function PublicHeader() {
  const user = useAuthStore(s => s.user);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loginArea = useRef<HTMLDivElement>(null);
  const loginButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => { setLoginOpen(false); setMobileOpen(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    if (!loginOpen && !mobileOpen) return;
    const outside = (event: PointerEvent) => { if (!loginArea.current?.contains(event.target as Node)) setLoginOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (loginOpen) loginButton.current?.focus();
      setLoginOpen(false); setMobileOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [loginOpen, mobileOpen]);
  const close = () => { setLoginOpen(false); setMobileOpen(false); };
  return <header className="public-header">
    <div className="public-nav">
      <Link to="/" className="public-brand" aria-label="FitBro home" onClick={close}><span><Dumbbell size={23} /></span><strong>FITBRO<sup>®</sup></strong></Link>
      <nav className="public-nav-links" aria-label="Website navigation">{navigation.map(item => <Link key={item.to} to={item.to} onClick={close}>{item.label}</Link>)}</nav>
      <div className="public-nav-actions">
        {user ? <Link className="public-login-button" to={user.role === 'owner' ? '/dashboard' : '/customer/dashboard'}>Dashboard <ArrowUpRight size={16} /></Link> :
          <div className="public-login-area" ref={loginArea}>
            <button type="button" className="public-login-button" ref={loginButton} aria-expanded={loginOpen} aria-controls="public-login-options" onClick={() => { setLoginOpen(!loginOpen); setMobileOpen(false); }}>Login <ChevronDown size={16} className={loginOpen ? 'public-chevron open' : 'public-chevron'} /></button>
            {loginOpen && <nav id="public-login-options" className="public-login-options" aria-label="Login and registration">
              <p>CHOOSE YOUR PORTAL</p>
              <Link to="/login" onClick={close}><span className="public-option-icon"><UserRound size={20} /></span><span><strong>Owner / Admin login</strong><small>Manage your gym and members</small></span><ArrowUpRight size={16} /></Link>
              <Link to="/customer/login" onClick={close}><span className="public-option-icon"><Users size={20} /></span><span><strong>Customer login</strong><small>View your membership and payments</small></span><ArrowUpRight size={16} /></Link>
              <div className="public-option-divider" />
              <Link to="/owner/register" onClick={close}><span className="public-option-icon"><Plus size={20} /></span><span><strong>Create owner account</strong><small>Set up a new gym workspace</small></span><ArrowUpRight size={16} /></Link>
            </nav>}
          </div>}
        <button className="public-mobile-toggle" type="button" aria-expanded={mobileOpen} aria-controls="public-mobile-navigation" aria-label={mobileOpen ? 'Close website menu' : 'Open website menu'} onClick={() => { setMobileOpen(!mobileOpen); setLoginOpen(false); }}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
    </div>
    {mobileOpen && <nav id="public-mobile-navigation" className="public-mobile-navigation" aria-label="Mobile website navigation">{navigation.map(item => <Link key={item.to} to={item.to} onClick={close}>{item.label}<ArrowUpRight size={16} /></Link>)}</nav>}
  </header>;
}
