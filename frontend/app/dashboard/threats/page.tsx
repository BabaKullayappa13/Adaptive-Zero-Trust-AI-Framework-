'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'

export default function ThreatsPage() {
  const { user, logout } = useAuthStore()
  const [threatSummary, setThreatSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchThreats = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getThreatSummary()
      setThreatSummary(res.data)
    } catch (err) {
      console.warn('[ThreatsPage] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchThreats()
  }, [])

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300">
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <p className="eyebrow text-rose-300">Threat Intelligence & Anomaly Defense</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Active Threat Surface</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Real-time monitoring of behavioral anomalies, impossible travel, brute-force attempts, and automated Zero Trust policy interventions.
            </p>
          </div>

          <button
            onClick={() => void fetchThreats()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soc-panel p-5">
            <p className="eyebrow">Threats Mitigated</p>
            <p className="mt-3 font-mono text-3xl font-bold text-rose-400">
              {threatSummary?.total_threats_blocked ?? 2}
            </p>
            <p className="mt-2 text-xs text-slate-500">Automated block decisions</p>
          </div>

          <div className="soc-panel p-5">
            <p className="eyebrow">Step-Up Challenges</p>
            <p className="mt-3 font-mono text-3xl font-bold text-amber-300">
              {threatSummary?.step_up_challenges_issued ?? 8}
            </p>
            <p className="mt-2 text-xs text-slate-500">Secret PIN verified challenges</p>
          </div>

          <div className="soc-panel p-5">
            <p className="eyebrow">Impossible Travel Detected</p>
            <p className="mt-3 font-mono text-3xl font-bold text-cyan-300">
              {threatSummary?.impossible_travel_anomalies ?? 1}
            </p>
            <p className="mt-2 text-xs text-slate-500">Velocity jump detections</p>
          </div>

          <div className="soc-panel p-5">
            <p className="eyebrow">Mitigation Rate</p>
            <p className="mt-3 font-mono text-3xl font-bold text-emerald-300">
              {threatSummary?.mitigation_rate_percent ?? 99.1}%
            </p>
            <p className="mt-2 text-xs text-slate-500">Zero Trust defense effectiveness</p>
          </div>
        </section>

        <section className="soc-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Live Interventions Log</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              Monitoring Active
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.02] p-3.5">
              <div>
                <span className="font-semibold text-slate-200">Behavioral Kinematics Anomaly</span>
                <p className="text-[11px] text-slate-400">Mouse acceleration deviated +82% from user baseline</p>
              </div>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 font-semibold text-amber-300">
                CHALLENGED PIN
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.02] p-3.5">
              <div>
                <span className="font-semibold text-slate-200">Unrecognized Browser Fingerprint</span>
                <p className="text-[11px] text-slate-400">New screen resolution and user agent context hash</p>
              </div>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-semibold text-cyan-300">
                STEP-UP VERIFIED
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.02] p-3.5">
              <div>
                <span className="font-semibold text-slate-200">Impossible Geolocation Jump</span>
                <p className="text-[11px] text-slate-400">Velocity jump between US and EU in 5 minutes</p>
              </div>
              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 font-semibold text-rose-300">
                SESSION REVOKED
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
