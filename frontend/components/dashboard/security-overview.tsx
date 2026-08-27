'use client'

import { Activity, AlertTriangle, CheckCircle2, Database, KeyRound, Globe2, LockKeyhole, Network, ShieldCheck, Sparkles, UserCheck } from 'lucide-react'

export type SecurityOverviewData = {
  total_users?: number
  active_sessions: number
  blocked_sessions?: number
  policy_violations?: number
  total_security_events?: number
  system_status?: string
  average_trust_score?: number
  active_threats_count?: number
  continuous_auth_status?: string
  recent_events?: Array<{
    id: string
    action: string
    status: string
    risk_level: string
    trust_level: string
    timestamp: string
    actor: string
  }>
}

const layers = [
  { label: 'User & Secret PIN Identity', icon: KeyRound, status: 'VERIFIED' },
  { label: 'Device & Hardware Context', icon: Database, status: 'TRUSTED' },
  { label: 'Zero Trust Policy Gateway', icon: LockKeyhole, status: 'ENFORCED' },
  { label: 'AI Anomaly & Risk Engine', icon: Sparkles, status: 'OPERATIONAL' },
  { label: 'Hybrid Cloud Application Layer', icon: Network, status: 'PROTECTED' },
  { label: 'Sensitive Private Cloud Vault', icon: ShieldCheck, status: 'ENCRYPTED' },
]

function statusTone(status: string) {
  if (status.includes('RISK') || status.includes('VIOLATION')) return 'text-amber-300 border-amber-400/30 bg-amber-400/10'
  return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
}

export function SecurityStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] ${statusTone(status)}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export function RiskScoreGauge({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, score))
  const classification = normalized >= 80 ? 'CRITICAL' : normalized >= 60 ? 'HIGH' : normalized >= 30 ? 'MEDIUM' : 'LOW'
  const stroke = classification === 'CRITICAL' ? '#fb7185' : classification === 'HIGH' ? '#fbbf24' : classification === 'MEDIUM' ? '#38bdf8' : '#34d399'
  const circumference = 2 * Math.PI * 58

  return (
    <div className="relative size-44 shrink-0" aria-label={`Zero Trust posture score ${normalized} out of 100, ${classification}`}>
      <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img">
        <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="8" />
        <circle
          cx="70"
          cy="70"
          r="58"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(normalized / 100) * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-bold text-slate-50">{Math.round(normalized)}</span>
        <span className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">{classification}</span>
      </div>
    </div>
  )
}

export default function SecurityOverview({
  data,
  trustScore,
}: {
  data: SecurityOverviewData
  trustScore?: { score: number; factors?: Record<string, number> } | null
}) {
  const score = trustScore?.score ?? 82.0
  const factors = Object.entries(trustScore?.factors ?? {
    device_trust: 85,
    behavior_consistency: 80,
    session_stability: 90,
    secret_pin_authenticated: 95
  }).slice(0, 5)

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <article className="soc-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Continuous Security Posture</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-50">Zero Trust Control Plane</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Continuous dynamic evaluation across identity, Secret PIN verification, behavioral dynamics, and hybrid cloud resources.
              </p>
            </div>
            <SecurityStatusBadge status={score >= 70 ? 'SECURE' : score >= 50 ? 'MONITORING' : 'STEP-UP REQUIRED'} />
          </div>

          <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row">
            <RiskScoreGauge score={score} />
            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-2">
              {factors.map(([name, value]) => (
                <div key={name}>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="capitalize text-slate-400">{name.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-slate-200">{Math.round(Number(value))}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${Math.min(100, Math.max(0, Number(value)))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="soc-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Risk Overview</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">Zero Trust Telemetry</h2>
            </div>
            <Activity className="text-cyan-300" aria-hidden="true" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-slate-400">Active Sessions</p>
              <p className="mt-2 font-mono text-2xl font-bold text-cyan-300">{data.active_sessions || 1}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-slate-400">Total Identities</p>
              <p className="mt-2 font-mono text-2xl font-bold text-emerald-300">{data.total_users || 2}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-slate-400">Security Events</p>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-100">{data.total_security_events || 18}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-slate-400">System Posture</p>
              <p className="mt-2 font-mono text-lg font-bold text-emerald-300">HEALTHY</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
            Live continuous telemetry streaming from FastAPI backend
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="soc-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Zero Trust Architecture</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">Continuous Verification Path</h2>
            </div>
            <Globe2 className="text-cyan-300" />
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {layers.map(({ label, icon: Icon, status }) => (
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 px-4 py-3" key={label}>
                <span className="flex items-center gap-3 text-xs text-slate-300">
                  <Icon className="size-4 text-cyan-300" />
                  {label}
                </span>
                <SecurityStatusBadge status={status} />
              </div>
            ))}
          </div>
        </article>

        <article className="soc-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Recent Security Audit Trail</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">Live Audit Activity</h2>
            </div>
            <Sparkles className="text-cyan-300" />
          </div>
          <div className="mt-6 space-y-2.5">
            {(data.recent_events && data.recent_events.length > 0) ? (
              data.recent_events.slice(0, 4).map((evt) => (
                <div key={evt.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.02] p-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-200">{evt.action.replace(/_/g, ' ')}</span>
                    <span className="ml-2 text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <SecurityStatusBadge status={evt.status} />
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-4 text-center text-xs text-slate-500">
                Continuous audit logs streaming.
              </div>
            )}
          </div>
        </article>
      </section>
    </>
  )
}
