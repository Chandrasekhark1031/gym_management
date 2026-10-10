import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2, Dumbbell, Layers3, LockKeyhole, QrCode, UserRound, Users, Wallet } from 'lucide-react';
import PublicHeader from '../components/layout/PublicHeader';
import { useAuthStore } from '../store/useAuthStore';
import gymPhoto from '../assets/gym_login_bg.jpg';
import './landing.css';

const features = [
  { icon: Users, title: 'Every member, in one place.', text: 'Register members with their photo and login details. Search your directory, update profiles and manage access.' },
  { icon: CalendarDays, title: 'Stay a step ahead of renewals.', text: 'Create flexible plans, assign memberships and see who expires in the next seven days. Send an in-app renewal reminder.' },
  { icon: Wallet, title: 'A clearer picture of your payments.', text: 'Record cash, UPI and bank payments. Review customer payment reports and confirm them before they count as collected revenue.' },
];
const steps = [
  { number: '01', title: 'Make it your gym.', text: 'Create your owner account. Add your gym details, contact information, plans and UPI / QR payment details.' },
  { number: '02', title: 'Bring your members in.', text: 'Create each customer’s account with an email and password, then assign their membership plan.' },
  { number: '03', title: 'Keep things moving.', text: 'Track renewals and offline payments. Your customers log in to view their own membership, payment history and updates.' },
];
const questions = [
  { question: 'How do customers get their login details?', answer: 'The gym owner creates each customer account in the Members section and gives them their email and password. Customers use Customer login. If they need a password reset, the owner can reset it from their member details.' },
  { question: 'How are payments tracked?', answer: 'Owners can record offline payments directly. Customers can report a cash, UPI or bank payment from their portal. The report stays pending until the owner verifies and confirms it.' },
  { question: 'Where can I see upcoming renewals?', answer: 'The owner dashboard shows memberships expiring within seven days. Open a member’s details to renew their plan or send an in-app renewal reminder.' },
];
export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const user = useAuthStore(s => s.user);
  const ownerStart = user ? user.role === 'owner' ? '/dashboard' : '/customer/dashboard' : '/owner/register';
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const configure = () => {
      observer?.disconnect();
      delete element.dataset.motion;
      if (preference.matches || !('IntersectionObserver' in window)) return;
      const items = element.querySelectorAll<HTMLElement>('[data-reveal]');
      items.forEach(item => { if (item.getBoundingClientRect().top < window.innerHeight) item.dataset.visible = 'true'; });
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.visible = 'true'; observer?.unobserve(entry.target); }
      }), { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
      items.forEach(item => observer?.observe(item));
      element.dataset.motion = 'on';
    };
    configure(); preference.addEventListener('change', configure);
    return () => { observer?.disconnect(); preference.removeEventListener('change', configure); };
  }, []);
  return <div className="fitbro-landing" ref={root}>
    <a href="#landing-content" className="skip-link">Skip to content</a>
    <PublicHeader />
    <main id="landing-content">
      <section className="landing-hero landing-container">
        <div className="landing-hero-copy">
          <p className="landing-kicker"><span />YOUR GYM. ALL TOGETHER.</p>
          <h1>A stronger gym.<br /><span>A simpler day.</span></h1>
          <p className="landing-hero-description">Less time on admin. More time for your community. Bring members, memberships and payments together with FitBro.</p>
          <div className="landing-hero-actions"><Link className="landing-button primary" to={ownerStart}>{user ? 'Open your dashboard' : 'Get started as an owner'}<ArrowUpRight size={19} /></Link><Link className="landing-text-button" to="/customer/login">Customer login <ArrowRight size={17} /></Link></div>
          <p className="landing-hero-note"><LockKeyhole size={14} />Separate owner and customer accounts.</p>
        </div>
        <div className="landing-hero-visual">
          <div className="landing-photo-frame"><img src={gymPhoto} alt="Dumbbells on the floor of a gym" fetchPriority="high" /><div className="landing-photo-shade" /><div className="landing-photo-caption"><span>BUILT FOR THE EVERYDAY</span><strong>Focus on the people.<br />We’ll help with the paperwork.</strong></div><span className="landing-photo-mark" aria-hidden="true"><Dumbbell size={27} /></span></div>
          <div className="landing-float member"><span className="landing-float-icon"><Users size={20} /></span><div><strong>A connected community</strong><small>Owner-managed member accounts</small></div><CheckCircle2 size={18} /></div>
          <div className="landing-float renewal"><span className="landing-float-icon"><CalendarDays size={20} /></span><div><strong>Renewals, in focus</strong><small>See the next seven days at a glance</small></div></div>
        </div>
      </section>
      <div className="landing-capabilities landing-container" aria-label="Gym management capabilities"><span><Users size={17} />Member management</span><span><Layers3 size={17} />Flexible plans</span><span><Wallet size={17} />Offline payments</span><span><QrCode size={17} />UPI & QR details</span></div>

      <section id="features" className="landing-features landing-container landing-section">
        <div className="landing-section-intro" data-reveal><p className="landing-kicker">MADE FOR YOUR DAILY ROUTINE</p><h2>Good for your gym.<br /><span>Better for your day.</span></h2><p>From the first registration to the next renewal, give every part of your gym a little more clarity.</p><Link to={ownerStart} className="landing-text-button">Explore your workspace <ArrowUpRight size={17} /></Link></div>
        <div className="landing-feature-list">{features.map((feature, i) => <article key={feature.title} data-reveal style={{ '--reveal-delay': (i * 70) + 'ms' } as CSSProperties}><span className="landing-feature-icon"><feature.icon size={24} strokeWidth={1.6} /></span><div><h3>{feature.title}</h3><p>{feature.text}</p></div><span className="landing-feature-number">0{i + 1}</span></article>)}</div>
      </section>

      <section id="how-it-works" className="landing-steps-section"><div className="landing-container"><div className="landing-steps-heading" data-reveal><div><p className="landing-kicker">A SIMPLE START</p><h2>From setup to stronger routines.</h2></div><p>One gym workspace.<br />A clear role for everyone.</p></div><div className="landing-steps">{steps.map((step, i) => <article key={step.number} data-reveal style={{ '--reveal-delay': (i * 90) + 'ms' } as CSSProperties}><span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></div></section>

      <section id="portals" className="landing-container landing-section"><div className="landing-centered-heading" data-reveal><p className="landing-kicker">TWO PORTALS. ONE COMMUNITY.</p><h2>The right view for everyone.</h2><p>A workspace for the owner. A personal portal for each member.</p></div><div className="landing-portals">
        <article className="landing-portal owner" data-reveal><div className="landing-portal-top"><span className="landing-portal-icon"><UserRound size={27} /></span><span>FOR GYM OWNERS</span></div><h3>You lead.<br />FitBro keeps things organised.</h3><ul><li><Check size={17} />Create customer accounts and manage access</li><li><Check size={17} />Manage plans, memberships and renewals</li><li><Check size={17} />Review payments and track collected revenue</li></ul><div className="landing-portal-actions"><Link className="landing-button primary" to={ownerStart}>{user ? 'Open dashboard' : 'Create owner account'}<ArrowUpRight size={18} /></Link><Link className="landing-text-button" to="/login">Owner / Admin login <ArrowRight size={16} /></Link></div></article>
        <article className="landing-portal customer" data-reveal style={{ '--reveal-delay': '90ms' } as CSSProperties}><div className="landing-portal-top"><span className="landing-portal-icon"><Users size={27} /></span><span>FOR CUSTOMERS</span></div><h3>Your membership.<br />Always within reach.</h3><ul><li><Check size={17} />View your plan, expiry date and profile</li><li><Check size={17} />Find gym contact, UPI and QR payment details</li><li><Check size={17} />Report payments and read renewal updates</li></ul><div className="landing-portal-actions"><Link className="landing-button secondary" to="/customer/login">Customer login<ArrowUpRight size={18} /></Link></div><p className="landing-portal-note"><LockKeyhole size={14} />Use the email and password your gym owner provides.</p></article>
      </div></section>

      <section className="landing-faq landing-container landing-section"><div data-reveal><p className="landing-kicker">A LITTLE MORE CLARITY</p><h2>Before you get started.</h2><p>Here’s how the owner and customer flows fit together.</p></div><div className="landing-questions" data-reveal>{questions.map(item => <details key={item.question}><summary>{item.question}<PlusIcon /></summary><p>{item.answer}</p></details>)}</div></section>

      <section className="landing-container landing-cta" data-reveal><span aria-hidden="true"><Bell size={27} /></span><div><p className="landing-kicker">YOUR NEXT CHAPTER STARTS HERE</p><h2>A little less admin.<br />A lot more momentum.</h2></div><Link to={ownerStart} className="landing-button light">{user ? 'Go to your dashboard' : 'Create your owner account'}<ArrowUpRight size={19} /></Link></section>
    </main>
    <footer className="landing-footer landing-container"><div><Link to="/" className="public-brand"><span><Dumbbell size={21} /></span><strong>FITBRO<sup>®</sup></strong></Link><p>A stronger gym, together.</p></div><nav aria-label="Footer account links"><Link to="/login">Owner / Admin login</Link><Link to="/owner/register">Owner registration</Link><Link to="/customer/login">Customer login</Link></nav><small>© {new Date().getFullYear()} FitBro</small></footer>
  </div>;
}
function PlusIcon() { return <span className="landing-faq-plus" aria-hidden="true">+</span>; }
