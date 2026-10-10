'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  ClipboardList,
  Gauge,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Radio,
  Users,
  FileDown
} from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminLiveMetrics from '@/components/admin-live-metrics'

const modules = [
  { href: '/admin/security', label: 'Live Threat Feed', description: 'Monitor threat indicators and real-time security events.', icon: ShieldAlert, tone: 'text-rose-400' },
  { href: '/admin/phase4', label: 'Attack Simulation', description: 'Execute zero-trust red-team simulations and posture assessments.', icon: Flame, tone: 'text-amber-400' },
  { href: '/admin/policies', label: 'Security Policies', description: 'Configure adaptive risk and trust thresholds with dynamic enforcement.', icon: Settings2, tone: 'text-cyan-400' },
  { href: '/admin/users', label: 'Users & Identities', description: 'Manage user lifecycle, suspend/block states, and MFA enrollments.', icon: Users, tone: 'text-blue-400' },
  { href: '/admin/sessions', label: 'Active Sessions', description: 'Track continuous session telemetry and trigger step-up challenges.', icon: Radio, tone: 'text-emerald-400' },
  { href: '/admin/performance', label: 'Cloud Gateways', description: 'Inspect hybrid-cloud routing latency, API health, and gateway metrics.', icon: Gauge, tone: 'text-indigo-400' },
  { href: '/admin/ai-monitoring', label: 'AI Monitoring Overview', description: 'Inspect XAI anomaly pipelines, CICIDS2026 model health, and SHAP attribution.', icon: BrainCircuit, tone: 'text-violet-400' },
  { href: '/admin/audit', label: 'Audit Activity', description: 'Cryptographically verifiable administrative event trail and logs.', icon: ClipboardList, tone: 'text-amber-300' },
  { href: '/admin/reports', label: 'Reports / Statement Download', description: 'Export statement of user activity in 1 Hour, 1 Day, or 1 Month intervals (CSV/JSON).', icon: FileDown, tone: 'text-teal-400' },
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
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-8">
            <header className="flex flex-col gap-6 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <LockKeyhole className="size-5" />
                  </span>
                  <p className="eyebrow text-cyan-300">Adaptive Zero-Trust Control Plane</p>
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                  Admin Command Center
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Centralized command console for user governance, explainable AI monitoring, hybrid cloud gateways, and security auditing.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                  Live SOC Connected
                </span>
              </div>
            </header>

            <AdminLiveMetrics />

            {/* Status cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="soc-panel p-5">
                <p className="eyebrow">Session Status</p>
                <p className="mt-2 text-xl font-semibold text-emerald-300">RBAC Established</p>
                <p className="mt-1 text-xs text-slate-500">FastAPI JWT & Cookie Authentication</p>
              </div>
              <div className="soc-panel p-5">
                <p className="eyebrow">Control Surface</p>
                <p className="mt-2 text-xl font-semibold text-cyan-300">
                  {health?.status === 'healthy'
                    ? 'Operational'
                    : health?.status === 'degraded'
                    ? 'Degraded'
                    : health?.status === 'unavailable'
                    ? 'Unavailable'
                    : 'Checking'}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-mono">
                  DB: {health?.database || 'connected'} · AI: {health?.ai_engine || 'active'}
                </p>
              </div>
              <div className="soc-panel p-5">
                <p className="eyebrow">Data Integrity Mode</p>
                <p className="mt-2 text-xl font-semibold text-violet-300">Strict Real-Data</p>
                <p className="mt-1 text-xs text-slate-500">Zero synthetic or fabricated records</p>
              </div>
            </section>

            {/* Modules Grid */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow">Administrative Architecture</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Security Modules & Workspaces</h2>
                </div>
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Activity className="size-4 text-cyan-300" />
                  9 Active Surfaces
                </span>
              </div>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modules.map(({ href, label, description, icon: Icon, tone }) => (
                  <Link
                    key={href}
                    href={href}
                    className="soc-panel group flex min-h-40 flex-col justify-between p-5 hover:border-cyan-400/40 transition"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] ${tone}`}>
                        <Icon className="size-5" />
                      </span>
                      <ArrowUpRight className="size-4 text-slate-600 transition group-hover:text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <div>
                      <h3 className="mt-4 text-base font-semibold text-slate-100 group-hover:text-cyan-200 transition">
                        {label}
                      </h3>
                      <p className="mt-1.5 text-xs leading-5 text-slate-400">
                        {description}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
