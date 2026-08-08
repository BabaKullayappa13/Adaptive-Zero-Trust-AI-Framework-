'use client'

import { Activity, AlertTriangle, CheckCircle2, Database, Fingerprint, Globe2, LockKeyhole, Network, ShieldCheck, Sparkles } from 'lucide-react'

export type SecurityOverviewData = {
  active_sessions: number
  blocked_sessions: number
  policy_violations: number
  risk_timeline: Array<{ risk_level: string; risk_score: number; created_at: string }>
  cloud: { mode: string; simulation: boolean; active_providers?: number; processed_by: Record<string, string> }
  federated_learning: { round: number | null; model_version: string | null; participating_clients: number; simulation: boolean; raw_data_shared: boolean }
}

const layers = [
  { label: 'Identity', icon: Fingerprint, status: 'VERIFIED' },
  { label: 'Device', icon: Database, status: 'TRUSTED' },
  { label: 'Policy engine', icon: LockKeyhole, status: 'ALLOWED' },
  { label: 'AI risk engine', icon: Sparkles, status: 'LOW RISK' },
  { label: 'Application', icon: Network, status: 'PROTECTED' },
  { label: 'Data', icon: ShieldCheck, status: 'ENCRYPTED' },
]

function statusTone(status: string) {
  if (status.includes('RISK')) return 'text-amber-300 border-amber-400/30 bg-amber-400/10'
  return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
}

export function SecurityStatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] ${statusTone(status)}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{status}</span>
}

export function RiskScoreGauge({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, score))
  const classification = normalized >= 81 ? 'CRITICAL' : normalized >= 61 ? 'HIGH' : normalized >= 31 ? 'MEDIUM' : 'LOW'
  const stroke = classification === 'CRITICAL' ? '#fb7185' : classification === 'HIGH' ? '#fbbf24' : '#34d399'
  const circumference = 2 * Math.PI * 58
  return <div className="relative size-44 shrink-0" aria-label={`Zero Trust posture score ${normalized} out of 100, ${classification}`}>
    <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img">
      <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="8" />
      <circle cx="70" cy="70" r="58" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(normalized / 100) * circumference} ${circumference}`} />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-mono text-4xl font-bold text-slate-50">{Math.round(normalized)}</span><span className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">{classification}</span></div>
  </div>
}

export default function SecurityOverview({ data, trustScore }: { data: SecurityOverviewData; trustScore?: { score: number; factors?: Record<string, number> } | null }) {
  const score = trustScore?.score ?? 0
  const riskCounts = data.risk_timeline.reduce((counts, item) => { const key = item.risk_level.toLowerCase(); counts[key] = (counts[key] ?? 0) + 1; return counts }, {} as Record<string, number>)
  const factors = Object.entries(trustScore?.factors ?? {}).slice(0, 5)

  return <>
    <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <article className="soc-panel p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Security posture</p><h2 className="mt-2 text-2xl font-semibold text-slate-50">Zero Trust control plane</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Continuous verification across identity, device, network, application, and data boundaries.</p></div><SecurityStatusBadge status={score >= 61 ? 'MONITORING' : 'SECURE'} /></div><div className="mt-8 flex flex-col items-center gap-8 sm:flex-row"><RiskScoreGauge score={score} /><div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">{factors.length ? factors.map(([name, value]) => <div key={name}><div className="flex justify-between gap-3 text-xs"><span className="capitalize text-slate-400">{name.replace(/_/g, ' ')}</span><span className="font-mono text-slate-200">{Math.round(value)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>) : <p className="text-sm text-slate-500">Awaiting factor telemetry from the backend.</p>}</div></div></article>
      <article className="soc-panel p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Risk overview</p><h2 className="mt-2 text-xl font-semibold text-slate-50">Threat inventory</h2></div><AlertTriangle className="text-amber-300" aria-hidden="true" /></div><div className="mt-6 grid grid-cols-2 gap-3">{[['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([key, label]) => <div key={key} className="rounded-lg border border-white/10 bg-white/[.03] p-4"><p className="text-xs text-slate-500">{label} risks</p><p className="mt-2 font-mono text-2xl font-bold text-slate-100">{riskCounts[key] ?? 0}</p></div>)}</div><div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><Activity className="size-4 text-cyan-300" />Live telemetry from the security service</div></article>
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ['Active sessions', data.active_sessions, 'text-cyan-300', 'Backend reported metric'],
        ['Blocked sessions', data.blocked_sessions, 'text-rose-300', 'Ended sessions'],
        ['Policy violations', data.policy_violations, 'text-amber-300', 'Non-ALLOW decisions'],
        ['Federated round', data.federated_learning.round ?? '—', 'text-emerald-300', data.federated_learning.model_version ?? 'No aggregate model'],
      ].map(([label, value, tone, caption]) => <article className="soc-panel soc-kpi p-5" key={String(label)}><p className="eyebrow">{label}</p><p className={`data-number mt-4 font-mono text-3xl font-bold ${tone}`}>{value}</p><p className="mt-2 text-xs text-slate-500">{caption}</p></article>)}</section>
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <article className="soc-panel p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Zero Trust architecture</p><h2 className="mt-2 text-xl font-semibold text-slate-50">Verification path</h2></div><Globe2 className="text-cyan-300" /></div><div className="mt-6 grid gap-2 sm:grid-cols-2">{layers.map(({ label, icon: Icon, status }) => <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 px-4 py-3" key={label}><span className="flex items-center gap-3 text-sm text-slate-300"><Icon className="size-4 text-cyan-300" />{label}</span><SecurityStatusBadge status={status} /></div>)}</div></article>
      <article className="soc-panel p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Explainable AI</p><h2 className="mt-2 text-xl font-semibold text-slate-50">Risk intelligence</h2></div><Sparkles className="text-cyan-300" /></div><div className="mt-6 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4"><div className="flex justify-between text-sm"><span className="text-slate-400">Decision confidence</span><span className="font-mono text-cyan-200">Backend telemetry</span></div><p className="mt-4 text-sm leading-6 text-slate-300">Risk explanations appear here when the XAI service returns feature importance and recommended actions. No synthetic analysis is shown during an API failure.</p></div><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Model: {data.federated_learning.model_version ?? 'No aggregate model'}</span><span>{data.federated_learning.simulation ? 'FEDERATED SIMULATION' : 'DATABASE TELEMETRY'}</span></div></article>
    </section>
  </>
}
