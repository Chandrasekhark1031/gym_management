import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, CalendarClock, Wallet, Plus, CalendarDays, ArrowUpRight, Bell, Check, Sparkles, ArrowRight, Layers3 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { gymService, assetUrl } from '../../services/gymService';
import { useToastStore } from '../../store/useToastStore';
import Button from '../../components/ui/Button';
import { LoadingState, ErrorState } from '../../components/ui/PageStates';
import { formatPaymentMethod } from '../../utils/display';
const money = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('');

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const showToast = useToastStore(s => s.show);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState(6);
  const [reminding, setReminding] = useState('');
  const load = () => { setError(''); Promise.all([gymService.dashboard.stats(), gymService.memberships.list(), gymService.payments.list(), gymService.customers.list()]).then(([s, m, p, c]) => setData({ stats: s.stats, memberships: m.memberships, payments: p.payments, customers: c.customers })).catch(() => setError('Unable to load your overview. Please try again.')); };
  useEffect(load, []);
  const series = useMemo(() => Array.from({ length: range }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - range + i + 1);
    const total = (data?.payments || []).filter((p: any) => { const at = new Date(p.paymentDate); return p.status === 'PAID' && at.getFullYear() === d.getFullYear() && at.getMonth() === d.getMonth(); }).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    return { label: d.toLocaleDateString('en-IN', { month: 'short' }), total };
  }), [range, data]);
  if (error) return <div><ErrorState message={error} /><Button onClick={load}>Try again</Button></div>;
  if (!data) return <LoadingState message="Bringing your gym into focus…" />;
  const { memberships, payments, customers } = data;
  const active = customers.filter((c: any) => ['ACTIVE', 'EXPIRING_SOON'].includes(c.membershipStatus)).length;
  const expiring = memberships.filter((m: any) => m.status === 'EXPIRING_SOON').sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
  const expired = customers.filter((c: any) => c.membershipStatus === 'EXPIRED').length;
  const awaiting = payments.filter((p: any) => p.status === 'PENDING').length;
  const monthPayments = payments.filter((p: any) => { const date = new Date(p.paymentDate), now = new Date(); return p.status === 'PAID' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); });
  const revenue = monthPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const monthlyTotal = series.reduce((s, p) => s + p.total, 0);
  const max = Math.max(1, ...series.map(p => p.total));
  const points = series.map((p, i) => `${25 + i * (550 / Math.max(1, series.length - 1))},${135 - (p.total / max) * 105}`).join(' ');
  const health = customers.length ? Math.round(active / customers.length * 100) : 0;
  const recent = [...payments].sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 5);
  const remind = async (m: any) => { setReminding(m.id); try { await gymService.notifications.remind(m.customerId); showToast(`Reminder added to ${m.customerName}'s portal.`, 'success'); } catch (e: any) { showToast(e.response?.data?.message || 'Could not save reminder.', 'error'); } finally { setReminding(''); } };
  return <div>
    <div className="gym-dashboard-hero"><div><div className="gym-eyebrow">YOUR GYM, IN FOCUS</div><h1>Welcome back, {user?.name?.split(' ')[0]} <span className="text-[#a7c487]">✦</span></h1><p>Here’s how your community is doing today.</p></div><div className="gym-hero-actions"><span className="gym-date-pill"><CalendarDays size={14} />{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span><Button onClick={() => navigate('/customers?add=1')}><Plus size={15} />Add member</Button></div></div>
    <div className="gym-stats">
      <Link to="/customers" className="gym-stat"><div className="gym-stat-label">Total members <Users size={18} /></div><div className="gym-stat-value">{customers.length.toString().padStart(2,'0')}</div><div className="gym-stat-note"><span className="text-[#6c8e4d]">●</span> Your gym community</div></Link>
      <Link to="/memberships" className="gym-stat"><div className="gym-stat-label">Active memberships <CalendarCheck size={18} /></div><div className="gym-stat-value">{active.toString().padStart(2,'0')}</div><div className="gym-stat-note"><Check size={12} /> Including upcoming renewals</div></Link>
      <Link to="/memberships?status=EXPIRING_SOON" className="gym-stat"><div className="gym-stat-label">Expiring this week <CalendarClock size={18} /></div><div className="gym-stat-value">{expiring.length.toString().padStart(2,'0')}</div><div className="gym-stat-note"><span>●</span> {expiring.length ? 'A good time to check in' : 'All memberships up to date'}</div></Link>
      <Link to="/payments" className="gym-stat"><div className="gym-stat-label">Collected this month <Wallet size={18} /></div><div className="gym-stat-value">{money(revenue)}</div><div className="gym-stat-note"><Check size={12} />Confirmed offline payments</div></Link>
    </div>
    <div className="gym-dashboard-grid">
      <section className="gym-panel"><div className="gym-section-heading"><div><h2>Revenue overview</h2><p>Every payment, a little progress.</p></div><select aria-label="Revenue period" className="rounded-lg border border-[#e0e7d7] p-2 text-[10px] text-[#76896a] bg-white" value={range} onChange={e => setRange(Number(e.target.value))}><option value={6}>Last 6 months</option><option value={3}>Last 3 months</option></select></div><div className="gym-chart-total"><strong>{money(monthlyTotal)}</strong><span>collected in {range} months</span></div><svg viewBox="0 0 600 160" className="gym-chart" role="img" aria-label={`Confirmed payment revenue. ${series.map(p => `${p.label}: ${money(p.total)}`).join(', ')}`}><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#95bb6b" stopOpacity=".32"/><stop offset="100%" stopColor="#95bb6b" stopOpacity=".02"/></linearGradient></defs>{[30,65,100,135].map(y => <line key={y} x1="10" y1={y} x2="590" y2={y} stroke="#eaf0e3" strokeDasharray="3 4"/>)}<polygon points={`25,145 ${points} 575,145`} fill="url(#revenue-fill)"/><polyline points={points} fill="none" stroke="#779954" strokeWidth="2.5" strokeLinejoin="round"/>{series.map((p,i) => <circle key={p.label} cx={25+i*(550/Math.max(1,series.length-1))} cy={135-p.total/max*105} r="3.7" fill="#8aad62" stroke="white" strokeWidth="2"><title>{p.label}: {money(p.total)}</title></circle>)}</svg><div className="gym-chart-labels">{series.map(p => <span key={p.label}>{p.label}</span>)}</div><div className="gym-chart-legend"><i/>Confirmed payments <span className="ml-auto">Cash · UPI · Bank transfer</span></div></section>
      <section className="gym-panel"><div className="gym-section-heading"><div><h2>Membership health</h2><p>A stronger community, one member at a time.</p></div><Layers3 size={17} className="text-[#849775]" /></div><div className="gym-health-wrap"><div className="gym-health-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="#edf0e4" strokeWidth="13"/><circle cx="60" cy="60" r="48" fill="none" stroke="#a6c573" strokeWidth="13" strokeDasharray={`${health /100*301.6} 301.6`} strokeLinecap="round"/></svg><div><strong>{health}%</strong><small>ACTIVE MEMBERS</small></div></div><div className="gym-health-legend"><div><i style={{background:'#a6c573'}}/>Active <strong>{customers.filter((c: any) => c.membershipStatus === 'ACTIVE').length}</strong></div><div><i style={{background:'#e7c36d'}}/>Expiring soon <strong>{expiring.length}</strong></div><div><i style={{background:'#cebca3'}}/>Expired <strong>{expired}</strong></div>{customers.some((c: any) => c.membershipStatus === 'UPCOMING') && <div><i style={{background:'#9aa9c2'}}/>Upcoming <strong>{customers.filter((c: any) => c.membershipStatus === 'UPCOMING').length}</strong></div>}<div><i style={{background:'#e0e5d7'}}/>No membership <strong>{customers.filter((c: any) => c.membershipStatus === 'NO_MEMBERSHIP').length}</strong></div></div></div><div className="gym-health-footer"><Sparkles size={13}/>{awaiting ? `${awaiting} payment${awaiting === 1 ? '' : 's'} awaiting your review.` : 'Payment reviews are up to date.'}</div></section>
    </div>
    <div className="gym-dashboard-grid">
      <section className="gym-panel"><div className="gym-section-heading"><div><h2>Recent payments</h2><p>Offline payments, all in one place.</p></div><Link to="/payments" className="gym-text-link">View all <ArrowUpRight size={13}/></Link></div>{recent.length ? <div className="gym-panel-table"><table><thead><tr><th>Member</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{recent.map((p: any) => <tr key={p.id}><td><div className="gym-payment-member"><span className="gym-member-avatar">{initials(p.customerName)}</span><div><strong>{p.customerName}</strong><small>{new Date(p.paymentDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</small></div></div></td><td><strong>{money(p.amount)}</strong></td><td>{formatPaymentMethod(p.paymentMethod)}</td><td><span className={`gym-paid-pill ${p.status !== 'PAID' ? 'pending' : ''}`}>{p.status === 'PAID' && <Check size={9}/>} {p.status === 'PAID' ? 'Paid' : p.status === 'PENDING' ? 'Pending' : 'Failed'}</span></td></tr>)}</tbody></table></div> : <p className="gym-empty">Record your first payment to see it here.</p>}</section>
      <section className="gym-panel"><div className="gym-section-heading"><div><h2>Renewals this week <span className="ml-1 bg-[#f6f0d8] px-1.5 py-0.5 rounded text-[9px] text-[#b39a56]">{expiring.length}</span></h2><p>A friendly reminder can make a difference.</p></div><Link to="/memberships?status=EXPIRING_SOON" className="gym-text-link"><ArrowUpRight size={15}/><span className="sr-only">View all renewals</span></Link></div><div className="gym-renewal-list">{expiring.slice(0,4).map((m: any) => <div key={m.id} className="gym-renewal-row"><Link to={`/customers/${m.customerId}`} className="gym-member-avatar">{customers.find((c:any) => c.id === m.customerId)?.photoUrl ? <img src={assetUrl(customers.find((c:any) => c.id === m.customerId).photoUrl)} alt=""/> : initials(m.customerName)}</Link><Link to={`/customers/${m.customerId}`} className="gym-renewal-name"><strong>{m.customerName}</strong><small>{m.planName}</small></Link><span className="gym-days-badge">{m.daysRemaining === 0 ? 'Today' : `${m.daysRemaining} days left`}</span><button className="gym-round-action" disabled={reminding === m.id} type="button" onClick={() => remind(m)} aria-label={`Remind ${m.customerName}`}><Bell size={12}/></button></div>)}{!expiring.length && <p className="gym-empty">No renewals due in the next seven days.</p>}</div></section>
    </div>
    <div className="gym-quick-links"><Link to="/plans"><Plus size={13}/>Manage plans</Link><Link to="/memberships"><CalendarCheck size={13}/>Assign a membership</Link><Link to="/payments"><Wallet size={13}/>Record an offline payment</Link><Link to="/profile">Gym contact & UPI details <ArrowRight size={13}/></Link></div>
  </div>;
}
