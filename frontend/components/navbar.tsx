'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, Bell, ChevronRight, ClipboardList, LayoutDashboard, LockKeyhole, LogOut, Network, Settings, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react'

interface NavbarProps { user: { email?: string }; onLogout: () => void }
const links = [
  { href: '/dashboard', label: 'Command center', icon: LayoutDashboard },
  { href: '/dashboard/threats', label: 'Threat intelligence', icon: ShieldCheck },
  { href: '/dashboard/xai', label: 'Explainable AI', icon: Sparkles },
  { href: '/dashboard/continuous-authentication', label: 'Trust monitor', icon: LockKeyhole },
  { href: '/dashboard/security-events', label: 'Security events', icon: Activity },
  { href: '/dashboard/audit', label: 'Audit logs', icon: ClipboardList },
  { href: '/dashboard/policies', label: 'Policy control', icon: SlidersHorizontal },
  { href: '/federated', label: 'Federated AI', icon: Network },
]

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter(); const pathname = usePathname()
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const logout = () => { onLogout(); router.push('/') }
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/[.08] bg-[#081426]/95 px-5 py-6 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-2"><span className="flex size-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300"><ShieldCheck className="size-5" /></span><span className="text-sm font-bold tracking-wide text-slate-100">ADAPTIVE <span className="text-cyan-300">ZERO TRUST</span><small className="mt-1 block text-[10px] font-medium tracking-[.22em] text-slate-500">SECURITY OPERATIONS</small></span></Link>
      <div className="mt-10"><p className="eyebrow px-3">Workspace</p><nav className="mt-3 flex flex-col gap-1" aria-label="Primary navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`group flex min-h-11 items-center justify-between rounded-xl px-3 text-sm ${active(href) ? 'bg-cyan-300/12 text-cyan-200' : 'text-slate-400 hover:bg-white/[.05] hover:text-slate-100'}`}><span className="flex items-center gap-3"><Icon className={`size-4 ${active(href) ? 'text-cyan-300' : 'text-slate-500'}`} />{label}</span>{active(href) && <ChevronRight className="size-4 text-cyan-300" />}</Link>)}</nav></div>
      <Link href="/admin" className="mt-8 flex min-h-11 items-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] px-3 text-sm text-cyan-200 hover:border-cyan-300/35"><Settings className="size-4" />Admin console<ChevronRight className="ml-auto size-4" /></Link>
      <div className="mt-auto rounded-2xl border border-violet-300/15 bg-violet-300/[.06] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-violet-200"><Sparkles className="size-4" />AI intelligence online</div><p className="mt-2 text-xs leading-5 text-slate-500">Explainable risk signals are monitored continuously.</p></div>
      <div className="mt-4 flex items-center gap-3 border-t border-white/[.08] pt-4"><div className="flex size-9 items-center justify-center rounded-full bg-cyan-300/15 text-xs font-bold text-cyan-200">{user?.email?.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{user?.email}</p><p className="text-[10px] uppercase tracking-widest text-slate-500">Operator</p></div><button type="button" onClick={logout} aria-label="Log out" className="rounded-lg p-2 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"><LogOut className="size-4" /></button></div>
    </aside>
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[.08] bg-[#081426]/95 px-4 py-3 backdrop-blur-xl lg:hidden"><Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-slate-100"><ShieldCheck className="size-5 text-cyan-300" />AZT <span className="text-cyan-300">AI</span></Link><div className="flex items-center gap-1"><button type="button" aria-label="Notifications" className="rounded-lg p-2 text-slate-400 hover:bg-white/[.06] hover:text-cyan-300"><Bell className="size-4" /></button><button type="button" aria-label="Log out" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-rose-400/10 hover:text-rose-300"><LogOut className="size-4" /></button></div></header>
    <nav className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-2xl border border-white/10 bg-[#101d34]/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">{links.slice(0, 5).map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} className={`flex size-11 items-center justify-center rounded-xl ${active(href) ? 'bg-cyan-300/15 text-cyan-200' : 'text-slate-500'}`}><Icon className="size-5" /></Link>)}</nav>
  </>
}
