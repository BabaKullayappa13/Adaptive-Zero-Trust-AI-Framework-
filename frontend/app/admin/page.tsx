'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, BrainCircuit, ClipboardList, Gauge, LockKeyhole, Settings2, ShieldCheck, Users } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminLiveMetrics from '@/components/admin-live-metrics'

const sections = [
  { href: '/admin/performance', label: 'System performance', description: 'Review API latency, authentication throughput, and service health.', icon: Gauge, tone: 'text-cyan-300' },
  { href: '/admin/security', label: 'Security operations', description: 'Open the protected security control surface and review posture signals.', icon: ShieldCheck, tone: 'text-emerald-300' },
  { href: '/admin/users', label: 'User management', description: 'Manage authorized identities and privileged access workflows.', icon: Users, tone: 'text-blue-300' },
  { href: '/admin/xai', label: 'AI risk intelligence', description: 'Inspect explainability and model decision context from the backend.', icon: BrainCircuit, tone: 'text-violet-300' },
  { href: '/admin/audit', label: 'Audit activity', description: 'Review administrative actions and security event history.', icon: ClipboardList, tone: 'text-amber-300' },
  { href: '/admin/policies', label: 'Policy management', description: 'Open policy controls and adaptive enforcement settings.', icon: Settings2, tone: 'text-cyan-300' },
]

export default function AdminPage() {
  const [health, setHealth] = useState<{ status: string; database?: string; ai_engine?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' })
        const contentType = response.headers.get('content-type') || ''
        const body = await response.text()
        let data: { status: string; database?: string; ai_engine?: string } | null = null
        if (body.trim() && contentType.includes('application/json')) {
          try {
            data = JSON.parse(body) as { status: string; database?: string; ai_engine?: string }
          } catch {
            data = null
          }
        }
        if (!response.ok || !data) throw new Error('health unavailable')
        if (!cancelled) setHealth(data)
      } catch {
        if (!cancelled) setHealth({ status: 'unavailable' })
      }
    }
    void load()
    const interval = window.setInterval(load, 30000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [])

  return <><AdminSessionGuard /><main className="soc-shell min-h-screen px-4 py-6 text-slate-100 sm:px-8 lg:px-16 lg:py-12"><div className="mx-auto max-w-7xl"><header className="reveal mb-8 flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-4 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200"><LockKeyhole className="size-5" /></span><p className="eyebrow text-cyan-200">Privileged control plane</p></div><h1 className="text-balance text-4xl font-semibold tracking-tight text-white">Admin command center</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Manage platform operations from a protected workspace. Backend authorization remains the source of truth for every action.</p></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-200"><span className="size-2 animate-pulse rounded-full bg-emerald-300" />Admin session active</span><Link href="/dashboard" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200">Public dashboard</Link><AdminLogoutButton /></div></header><AdminLiveMetrics /><section className="mb-8 grid gap-4 sm:grid-cols-3"><div className="soc-panel p-5"><p className="eyebrow">Session status</p><p className="mt-3 text-xl font-semibold text-emerald-200">Authenticated</p><p className="mt-2 text-xs text-slate-500">Protected httpOnly session</p></div><div className="soc-panel p-5"><p className="eyebrow">Control surface</p><p className="mt-3 text-xl font-semibold text-cyan-200">{health?.status === 'healthy' ? 'Operational' : health?.status === 'degraded' ? 'Degraded' : health?.status === 'unavailable' ? 'Unavailable' : 'Checking'}</p><p className="mt-2 text-xs text-slate-500">Database: {health?.database || 'pending'} · AI: {health?.ai_engine || 'pending'}</p></div><div className="soc-panel p-5"><p className="eyebrow">Workspace</p><p className="mt-3 text-xl font-semibold text-violet-200">Privileged</p><p className="mt-2 text-xs text-slate-500">Administrative access only</p></div></section><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Administration</p><h2 className="mt-2 text-xl font-semibold text-white">Control modules</h2></div><span className="inline-flex items-center gap-2 text-xs text-slate-500"><Activity className="size-4 text-cyan-300" />Live workspace</span></div><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map(({ href, label, description, icon: Icon, tone }) => <Link key={href} href={href} className="soc-panel group flex min-h-44 flex-col justify-between p-5"><div className="flex items-start justify-between"><span className={`flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] ${tone}`}><Icon className="size-5" /></span><ArrowUpRight className="size-4 text-slate-600 transition group-hover:text-cyan-300" /></div><div><h3 className="mt-6 text-base font-semibold text-slate-100">{label}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div></Link>)}</section></div></main>
  </>
}
