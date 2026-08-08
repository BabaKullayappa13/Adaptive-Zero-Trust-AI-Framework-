'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings, ShieldCheck } from 'lucide-react'

interface NavbarProps { user: { email?: string }; onLogout: () => void }

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter()
  const handleLogout = () => { onLogout(); router.push('/') }
  return <nav className="sticky top-0 z-20 border-b border-white/10 bg-[#060b14]/90 backdrop-blur-xl"><div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"><Link href="/dashboard" className="flex items-center gap-3 text-sm font-semibold tracking-wide text-slate-100"><span className="flex size-9 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-300"><ShieldCheck className="size-5" /></span><span className="hidden sm:inline">ADAPTIVE ZERO TRUST <span className="text-cyan-300">AI</span></span></Link><div className="hidden items-center gap-6 text-xs font-medium text-slate-400 md:flex"><Link href="/dashboard" className="transition hover:text-cyan-300">Overview</Link><Link href="/security" className="transition hover:text-cyan-300">Security</Link><Link href="/policies" className="transition hover:text-cyan-300">Policies</Link><Link href="/federated" className="transition hover:text-cyan-300">Federated learning</Link><Link href="/admin" className="transition hover:text-cyan-300">Admin console</Link></div><div className="flex items-center gap-2"><button type="button" aria-label="Notifications" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[.06] hover:text-cyan-300"><Bell className="size-4" /></button><button type="button" aria-label="Security settings" onClick={() => router.push('/security')} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[.06] hover:text-cyan-300"><Settings className="size-4" /></button><div className="hidden border-l border-white/10 pl-3 sm:block"><p className="max-w-40 truncate text-xs font-medium text-slate-200">{user?.email}</p><p className="text-[10px] uppercase tracking-widest text-slate-500">Operator</p></div><button type="button" onClick={handleLogout} aria-label="Log out" className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-400/10"><LogOut className="size-4" /></button></div></div></nav>
}
