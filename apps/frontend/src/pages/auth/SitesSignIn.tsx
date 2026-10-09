import { Dumbbell, ArrowUpRight, Users, CalendarDays, Wallet, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import gymBg from '../../assets/gym_login_bg.jpg';

export default function SitesSignIn() {
  const sessionError = useAuthStore((s) => s.sessionError);
  return <main className="min-h-dvh grid lg:grid-cols-2 bg-[#f5f7f1] text-[#193b31]">
    <section className="flex flex-col p-6 sm:p-12 lg:p-16">
      <a href="/" className="gym-brand !text-[#193b31] w-fit" aria-label="FitBro home"><div className="gym-brand-mark"><Dumbbell size={25} /></div><div><strong>FITBRO<span>®</span></strong><small>GYM MANAGEMENT</small></div></a>
      <div className="my-auto max-w-md py-16 sm:py-20">
        <span className="gym-eyebrow">YOUR GYM, IN FOCUS</span>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.12] mt-5">Keep your community<br />moving forward.</h1>
        <p className="text-[#6c7d71] leading-relaxed mt-5">Members, plans, renewals and offline payments. One clear workspace for a stronger gym.</p>
        <div className="bg-white border border-[#e0e7db] rounded-2xl p-5 sm:p-6 mt-9">
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={20} /> Owner access</div>
          <p className="text-sm text-[#6c7d71] leading-relaxed mt-2">Sign in with the gym owner's ChatGPT account to manage members and open customer previews.</p>
          {sessionError && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mt-4">{sessionError}</p>}
          <a href="/signin-with-chatgpt?return_to=%2Fdashboard" target="_top" className="flex items-center justify-center gap-3 bg-[#194c3e] text-white font-semibold rounded-xl min-h-12 px-4 mt-5 hover:bg-[#113b30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Sign in with ChatGPT <ArrowUpRight size={18} /></a>
          {sessionError && <a href="/signout-with-chatgpt?return_to=%2F" target="_top" className="block text-center text-sm underline underline-offset-4 mt-4">Switch ChatGPT account</a>}
        </div>
        <p className="text-xs text-[#788977] mt-5 leading-relaxed">This page is public. Member details and payment records are available only to the authorised gym owner.</p>
      </div>
      <footer className="text-[11px] text-[#788977]">FITBRO · A stronger gym, together.</footer>
    </section>
    <aside className="hidden lg:flex relative min-h-dvh overflow-hidden bg-[#12382d] text-white items-end p-12 xl:p-16">
      <img src={gymBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c2e23] via-[#12382d]/20 to-transparent" />
      <div className="relative z-10 w-full"><span className="gym-eyebrow !text-[#c7f178]">A LITTLE CONSISTENCY. A LOT OF PROGRESS.</span><h2 className="text-4xl xl:text-5xl font-semibold leading-tight mt-5 max-w-md">Built for the people who show up.</h2>
        <div className="grid grid-cols-3 gap-3 mt-10">{[{icon:Users,label:'Members'},{icon:CalendarDays,label:'Renewals'},{icon:Wallet,label:'Offline payments'}].map(({icon:Icon,label})=><div key={label} className="border border-white/20 rounded-2xl bg-white/10 p-4"><Icon size={22} className="text-[#c7f178] mb-3" /><span className="text-sm">{label}</span></div>)}</div>
      </div>
    </aside>
  </main>;
}
