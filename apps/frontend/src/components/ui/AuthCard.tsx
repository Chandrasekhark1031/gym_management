import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../layout/PublicHeader';
import { Dumbbell, ArrowLeft, Users, CalendarDays, Wallet } from 'lucide-react';
interface AuthCardProps { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; topElement?: ReactNode; }
export default function AuthCard({ title, subtitle, children, footer, topElement }: AuthCardProps) {
  return <div className="fitbro-public"><PublicHeader /><main className="fitbro-auth min-h-screen flex items-center justify-center bg-[#f6f8f5] p-4 sm:p-8">
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e3e8dd] bg-white shadow-xl lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#142c26] p-10 text-white lg:flex">
        <div className="relative z-10 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#c2f17d] text-[#142c26]"><Dumbbell size={27} /></div><div><strong className="text-2xl tracking-wide">FITBRO</strong><p className="text-[10px] tracking-[.2em] text-[#aec0ae]">GYM MANAGEMENT</p></div></div>
        <div className="relative z-10 py-14"><span className="text-xs tracking-widest text-[#c2f17d]">A STRONGER GYM, TOGETHER</span><h2 className="mt-5 text-5xl font-semibold leading-tight tracking-tight">Less admin.<br /><span className="text-[#c2f17d]">More momentum.</span></h2><p className="mt-6 max-w-sm leading-relaxed text-[#b6c8b6]">One place for your members, memberships and payments. Keep your community moving.</p></div>
        <div className="relative z-10 space-y-4 text-sm text-[#dce5dd]"><p className="flex items-center gap-3"><Users size={18} className="text-[#c2f17d]" />Create and manage member accounts</p><p className="flex items-center gap-3"><CalendarDays size={18} className="text-[#c2f17d]" />Stay on top of renewals</p><p className="flex items-center gap-3"><Wallet size={18} className="text-[#c2f17d]" />Track payments with confidence</p></div>
        <div aria-hidden="true" className="absolute -right-44 top-28 h-96 w-96 rounded-full border-[50px] border-[#243f32]" />
      </section>
      <section className="min-w-0 px-5 py-8 sm:p-10 lg:px-12 lg:py-12">
        <Link to="/" className="mb-7 inline-flex min-h-8 items-center gap-2 text-sm text-[#6b8460]"><ArrowLeft size={15} />Back to home</Link>
        {topElement && <div className="mb-8">{topElement}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-[#20372e] sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-3 mb-7 text-sm leading-relaxed text-[#7c8b73]">{subtitle}</p>}
        {children}
        {footer && <div className="mt-7 border-t border-[#e8ede3] pt-6 text-center">{footer}</div>}
      </section>
    </div>
  </main></div>;
}
