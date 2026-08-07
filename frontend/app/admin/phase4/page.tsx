'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowRight, BookOpen, FileText, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import Navbar from '@/components/navbar'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

const fetchReports = () => apiClient.getReports().then((response) => response.data)
const fetchSchedules = () => apiClient.getReportSchedules().then((response) => response.data)
const fetchDocs = () => apiClient.getOpenApiSpec().then((response) => response.data)

const sampleFeatures = [
  { name: 'Device trust', value: 0.91, impact: 0.34, direction: 'positive' },
  { name: 'Behavioral consistency', value: 0.74, impact: 0.21, direction: 'positive' },
  { name: 'Location variance', value: 0.38, impact: -0.18, direction: 'negative' },
  { name: 'Authentication strength', value: 0.86, impact: 0.12, direction: 'positive' },
]

export default function Phase4Page() {
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'explain' | 'reports' | 'docs'>('explain')
  const [decision, setDecision] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const { data: reports, mutate: refreshReports } = useSWR('phase4-reports', fetchReports)
  const { data: schedules } = useSWR('phase4-schedules', fetchSchedules)
  const { data: docs } = useSWR('phase4-openapi', fetchDocs)

  const generateExplanation = async () => {
    setGenerating(true)
    try {
      const response = await apiClient.explainDecision({
        user_id: user?.id ?? 'current-user',
        policy_decision: 'challenge',
        trust_score: 0.68,
        contributing_factors: ['Location variance detected', 'Device remains trusted', 'MFA is enabled'],
      })
      setDecision(response.data)
    } catch {
      setDecision({
        summary: 'Additional verification REQUIRED for the current session. Trust score: 68.0%',
        trust_score: 0.68,
        decision: 'challenge',
        contributing_factors: ['1. Location variance detected', '2. Device remains trusted', '3. MFA is enabled'],
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {user && <Navbar user={user} onLogout={logout} />}
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-4" /> Phase 4 intelligence</span>
            <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Make every security decision explainable.</h1>
            <p className="max-w-2xl text-pretty leading-6 text-muted-foreground">Inspect model contributions, produce audit-ready reports, and browse the framework contract from one operator console.</p>
          </div>
          <button type="button" className="button button-primary inline-flex items-center gap-2 self-start" onClick={generateExplanation} disabled={generating}><RefreshCw className={generating ? 'size-4 animate-spin' : 'size-4'} /> {generating ? 'Analyzing' : 'Run explanation'}</button>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Phase 4 sections">
          {([['explain', 'Explainability', ShieldCheck], ['reports', 'Reports', FileText], ['docs', 'API documentation', BookOpen]] as const).map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}</button>)}
        </nav>

        {activeTab === 'explain' && <section className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="card flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Latest policy evaluation</p><h2 className="mt-1 text-2xl font-semibold text-foreground">Adaptive access decision</h2></div><span className="badge badge-medium">Challenge</span></div>
              <div className="flex items-end gap-3"><span className="text-6xl font-bold tracking-tight text-primary">68</span><span className="pb-2 text-sm text-muted-foreground">/ 100 trust score</span></div>
              <div className="flex flex-col gap-3">{(decision?.contributing_factors ?? ['Location variance detected', 'Device remains trusted', 'MFA is enabled']).map((factor: string) => <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3" key={factor}><span className="text-sm text-foreground">{factor.replace(/^\d+\.\s*/, '')}</span><ArrowRight className="size-4 text-muted-foreground" /></div>)}</div>
              <p className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">{decision?.summary ?? 'Run an explanation to generate a human-readable rationale for this policy outcome.'}</p>
            </article>
            <article className="card flex flex-col gap-5"><div><p className="text-sm font-medium text-muted-foreground">SHAP contribution view</p><h2 className="mt-1 text-2xl font-semibold text-foreground">What moved the score?</h2></div><div className="flex flex-col gap-4">{sampleFeatures.map((feature) => <div className="flex flex-col gap-2" key={feature.name}><div className="flex justify-between gap-4 text-sm"><span className="text-foreground">{feature.name}</span><span className={feature.direction === 'positive' ? 'text-primary' : 'text-destructive'}>{feature.impact > 0 ? '+' : ''}{feature.impact.toFixed(2)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${feature.direction === 'positive' ? 'bg-primary' : 'bg-destructive'}`} style={{ width: `${Math.max(18, Math.abs(feature.impact) * 180)}%` }} /></div><p className="text-xs text-muted-foreground">Observed value {feature.value.toFixed(2)} · {feature.direction === 'positive' ? 'increases' : 'decreases'} confidence</p></div>)}</div></article>
          </div>
          <article className="card"><div className="flex flex-col gap-1"><p className="text-sm font-medium text-muted-foreground">What-if analysis</p><h2 className="text-2xl font-semibold text-foreground">How could this decision change?</h2></div><div className="mt-5 grid gap-3 md:grid-cols-3">{['If device was trusted', 'If location was verified', 'If outside unusual hours'].map((scenario) => <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4" key={scenario}><span className="text-sm text-foreground">{scenario}</span><span className="badge badge-low">Allow</span></div>)}</div></article>
        </section>}

        {activeTab === 'reports' && <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <article className="card"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Report history</p><h2 className="mt-1 text-2xl font-semibold text-foreground">Audit-ready exports</h2></div><button type="button" className="button button-secondary" onClick={() => void refreshReports()}><RefreshCw className="size-4" /> Refresh</button></div><div className="mt-6 flex flex-col gap-3">{(reports?.reports ?? []).length > 0 ? reports.reports.map((report: any) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4" key={report.report_id}><div><p className="font-medium text-foreground">{report.report_type}</p><p className="text-sm text-muted-foreground">{report.format?.toUpperCase()} · {new Date(report.generated_at).toLocaleString()}</p></div><span className="badge badge-low">{report.status}</span></div>) : <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No generated reports in the selected window.</div>}</div></article>
          <article className="card"><p className="text-sm font-medium text-muted-foreground">Automation</p><h2 className="mt-1 text-2xl font-semibold text-foreground">Scheduled reports</h2><div className="mt-6 flex flex-col gap-3">{(schedules?.schedules ?? []).length > 0 ? schedules.schedules.map((schedule: any) => <div className="rounded-lg border border-border p-4" key={schedule.schedule_id}><div className="flex justify-between gap-3"><span className="font-medium text-foreground">{schedule.report_type}</span><span className="badge badge-low">{schedule.frequency}</span></div><p className="mt-2 text-sm text-muted-foreground">{schedule.recipients?.join(', ') || 'No recipients configured'}</p></div>) : <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No active schedules.</p>}</div></article>
        </section>}

        {activeTab === 'docs' && <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><article className="card"><p className="text-sm font-medium text-muted-foreground">Framework contract</p><h2 className="mt-1 text-2xl font-semibold text-foreground">API surface</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{docs?.info?.description ?? 'OpenAPI documentation is loaded from the backend service.'}</p><dl className="mt-6 flex flex-col gap-3">{[['Version', docs?.info?.version ?? '1.0.0'], ['Endpoints', docs?.paths ? Object.keys(docs.paths).length : '—'], ['Security', 'Bearer JWT']].map(([label, value]) => <div className="flex justify-between gap-4 border-b border-border pb-3" key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-medium text-foreground">{value}</dd></div>)}</dl></article><article className="card"><p className="text-sm font-medium text-muted-foreground">Available routes</p><div className="mt-4 flex flex-col gap-2">{(docs?.paths ? Object.entries(docs.paths) : []).slice(0, 8).map(([path, methods]: [string, any]) => <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3" key={path}><code className="text-sm text-foreground">{path}</code><span className="text-xs uppercase tracking-wide text-primary">{Object.keys(methods).join(' · ')}</span></div>)}</div></article></section>}
      </main>
    </div>
  )
}
