'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'
import TrustScoreCard from '@/components/dashboard/trust-score-card'
import RiskEventsList from '@/components/dashboard/risk-events-list'
import AuditLogsTable from '@/components/dashboard/audit-logs-table'
import Charts from '@/components/dashboard/charts'
import Navbar from '@/components/navbar'

interface Summary {
  trust_history: Array<{ score: number; created_at: string }>
  risk_timeline: Array<{ risk_level: string; risk_score: number; created_at: string }>
  active_sessions: number
  blocked_sessions: number
  policy_violations: number
  cloud: { mode: string; simulation: boolean; processed_by: Record<string, string> }
  federated_learning: { round: number; model_version: string; participating_clients: number; simulation: boolean; raw_data_shared: boolean }
  models: Array<{ name: string; version: string; status: string; metrics_available: boolean }>
}

const metricCards = [
  ['Active sessions', 'active_sessions'],
  ['Blocked sessions', 'blocked_sessions'],
  ['Policy violations', 'policy_violations'],
] as const

export default function DashboardPage() {
  const router = useRouter()
  const { user, accessToken, logout, loadUser } = useAuthStore()
  const [trustScore, setTrustScore] = useState<any>(null)
  const [riskEvents, setRiskEvents] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void loadUser() }, [loadUser])
  useEffect(() => {
    if (!user || !accessToken) router.push('/auth/login')
  }, [user, accessToken, router])

  useEffect(() => {
    if (!user) return
    let active = true
    const loadData = async () => {
      try {
        setError(null)
        const [scoreRes, summaryRes, logsRes] = await Promise.all([
          apiClient.getTrustScore(user.id),
          apiClient.getDashboardSummary(),
          apiClient.getAuditLogs(user.id, 10),
        ])
        if (!active) return
        setTrustScore(scoreRes.data)
        setSummary(summaryRes.data)
        setRiskEvents((summaryRes.data.risk_timeline || []).map((event: any, index: number) => ({ ...event, id: `risk-${index}`, event_type: 'Continuous assessment', risk_score: event.risk_score, context: {}, explanation: {} })))
        setAuditLogs(logsRes.data.logs || [])
      } catch (err) {
        if (active) setError('Unable to load security telemetry. Verify the API and database connection.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadData()
    const interval = window.setInterval(() => void loadData(), 30000)
    return () => { active = false; window.clearInterval(interval) }
  }, [user])

  if (!user || !accessToken) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={logout} />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold text-foreground">Security dashboard</h1>
            <span className="badge badge-low">Live · 30s assessment</span>
          </div>
          <p className="text-slate-400">Continuous trust monitoring with proposal features clearly marked when simulated.</p>
        </header>

        {error && <div role="alert" className="card border-danger/40 text-danger">{error}</div>}
        {loading && <div className="card text-slate-400" role="status">Loading security telemetry…</div>}

        {!loading && summary && (
          <>
            <section aria-label="Security status" className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {metricCards.map(([label, key]) => (
                <div className="card" key={key}><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold text-foreground">{summary[key]}</p></div>
              ))}
            </section>
            {trustScore && <TrustScoreCard trustScore={trustScore} />}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-foreground">Hybrid cloud posture</h2><p className="mt-1 text-slate-400">Processing placement is a demonstrable simulation.</p></div><span className="badge badge-medium">Simulation</span></div><p className="mt-5 text-3xl font-bold capitalize text-primary">{summary.cloud.mode} cloud</p><dl className="mt-4 flex flex-col gap-2 text-sm">{Object.entries(summary.cloud.processed_by).map(([key, value]) => <div className="flex justify-between gap-4" key={key}><dt className="capitalize text-slate-400">{key.replace('_', ' ')}</dt><dd className="text-foreground">{value}</dd></div>)}</dl></div>
              <div className="card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-foreground">Federated learning</h2><p className="mt-1 text-slate-400">FedAvg workflow status; client rows never leave the simulator.</p></div><span className="badge badge-medium">Simulation</span></div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-bold text-foreground">{summary.federated_learning.round}</p><p className="text-xs text-slate-400">Round</p></div><div><p className="text-2xl font-bold text-foreground">{summary.federated_learning.participating_clients}</p><p className="text-xs text-slate-400">Clients</p></div><div><p className="text-2xl font-bold text-primary">FedAvg</p><p className="text-xs text-slate-400">Strategy</p></div></div></div>
            </section>
            <Charts />
            <section className="card"><h2 className="text-xl font-semibold text-foreground">Model registry</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{summary.models.map((model) => <div className="rounded-lg border border-slate-700 p-4" key={model.version}><p className="font-semibold text-foreground">{model.name}</p><p className="text-sm text-slate-400">{model.version}</p><span className="badge badge-medium mt-3">{model.status}{model.metrics_available ? '' : ' · metrics pending'}</span></div>)}</div></section>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2"><RiskEventsList events={riskEvents} /><AuditLogsTable logs={auditLogs} /></div>
          </>
        )}
      </main>
    </div>
  )
}
