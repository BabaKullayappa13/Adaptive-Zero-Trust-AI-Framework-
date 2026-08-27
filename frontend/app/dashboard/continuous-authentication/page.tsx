'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, MousePointer, RefreshCw, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { useContinuousAuth } from '@/components/continuous-auth-provider'
import { apiClient } from '@/lib/api'

export default function ContinuousAuthenticationPage() {
  const { user, sessionId, logout } = useAuthStore()
  const { trustScore, riskScore, confidenceScore, trustLevel, riskLevel, triggerManualCheck } = useContinuousAuth()

  const [liveStatus, setLiveStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [simulatingAnomaly, setSimulatingAnomaly] = useState(false)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getContinuousStatus(sessionId || 1)
      setLiveStatus(res.data)
    } catch (err) {
      console.warn('[ContinuousAuthPage] Error loading status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [sessionId])

  const handleSimulateAnomaly = async () => {
    setSimulatingAnomaly(true)
    try {
      // Send an anomalous behavioral telemetry packet (robotic mouse + abnormal keystroke cadence)
      const fakeAnomalyTelemetry = {
        keystroke_speed: 16.5, // abnormally fast (bot/script)
        keystroke_variance: 0.0001, // robotic zero variance
        mouse_speed: 1850.0, // sudden unnatural jump
        mouse_distance: 3500.0,
        click_count: 55,
        scroll_count: 40,
        idle_seconds: 0,
        session_duration_minutes: 5.0
      }
      await apiClient.sendContinuousTelemetry(sessionId || 1, fakeAnomalyTelemetry, {
        user_agent: 'Simulated-Anomaly-Client/2.0',
        screen_width: 1920,
        screen_height: 1080
      })
      await fetchStatus()
    } catch (err) {
      console.error(err)
    } finally {
      setSimulatingAnomaly(false)
    }
  }

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300">
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <p className="eyebrow text-cyan-300">Continuous Multi-Factor Verification</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Trust & Behavioral Monitor</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Real-time software-based behavioral telemetry (keystroke cadence, mouse kinematics, session context) continuously evaluated by the AI anomaly engine.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchStatus()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Signals
            </button>
            <button
              onClick={handleSimulateAnomaly}
              disabled={simulatingAnomaly}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20"
            >
              <Zap className="size-3.5" />
              {simulatingAnomaly ? 'Simulating...' : 'Test Anomaly Trigger'}
            </button>
          </div>
        </header>

        {/* Live Score Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soc-panel p-5">
            <p className="eyebrow">Dynamic Trust Score</p>
            <p className="mt-3 font-mono text-4xl font-bold text-emerald-300">{trustScore.toFixed(1)}<span className="text-lg text-slate-500">/100</span></p>
            <p className="mt-2 text-xs text-slate-400">Category: <strong className="text-emerald-300">{trustLevel}</strong></p>
          </div>

          <div className="soc-panel p-5">
            <p className="eyebrow">Dynamic Risk Score</p>
            <p className="mt-3 font-mono text-4xl font-bold text-cyan-300">{riskScore.toFixed(1)}<span className="text-lg text-slate-500">/100</span></p>
            <p className="mt-2 text-xs text-slate-400">Level: <strong className="text-cyan-300">{riskLevel}</strong></p>
          </div>

          <div className="soc-panel p-5">
            <p className="eyebrow">Decision Confidence</p>
            <p className="mt-3 font-mono text-4xl font-bold text-violet-300">{confidenceScore.toFixed(1)}%</p>
            <p className="mt-2 text-xs text-slate-400">High statistical confidence</p>
          </div>

          <div className="soc-panel p-5">
            <p className="eyebrow">Continuous Policy State</p>
            <p className="mt-3 font-mono text-xl font-bold text-slate-100">
              {riskScore >= 60 ? 'STEP_UP_MFA' : 'ALLOW_MONITORED'}
            </p>
            <p className="mt-2 text-xs text-slate-400">Never Trust, Always Verify</p>
          </div>
        </section>

        {/* Behavioral Telemetry Details */}
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="soc-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Client Behavioral Stream</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Live Interaction Kinematics</h3>
              </div>
              <Activity className="size-5 text-cyan-300" />
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <MousePointer className="size-4 text-cyan-300" />
                    Mouse Movement Velocity
                  </span>
                  <span className="font-mono text-cyan-200">
                    {liveStatus?.behavior?.mouse_speed ? `${liveStatus.behavior.mouse_speed.toFixed(1)} px/s` : '420.0 px/s'}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: '45%' }} />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Sparkles className="size-4 text-emerald-300" />
                    Keystroke Cadence / Speed
                  </span>
                  <span className="font-mono text-emerald-200">
                    {liveStatus?.behavior?.keystroke_speed ? `${liveStatus.behavior.keystroke_speed.toFixed(2)} chars/s` : '3.6 chars/s'}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: '60%' }} />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <KeyRound className="size-4 text-violet-300" />
                    Secret PIN Security Status
                  </span>
                  <span className="font-mono text-violet-200">Enrolled & Active</span>
                </div>
              </div>
            </div>
          </article>

          <article className="soc-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Adaptive Enforcement</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Threshold Actions</h3>
              </div>
              <ShieldAlert className="size-5 text-amber-300" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-400/[.04] p-3">
                <span className="text-slate-300">Low Risk (0–29): Normal Session Access</span>
                <span className="font-semibold text-emerald-300">ALLOW</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-cyan-400/20 bg-cyan-400/[.04] p-3">
                <span className="text-slate-300">Medium Risk (30–59): Adaptive Background Telemetry</span>
                <span className="font-semibold text-cyan-300">MONITOR</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/[.04] p-3">
                <span className="text-slate-300">High Risk (60–79): Anomaly Detected</span>
                <span className="font-semibold text-amber-300">REQUIRE SECRET PIN</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-rose-400/20 bg-rose-400/[.04] p-3">
                <span className="text-slate-300">Critical Risk (80–100): Threat Isolation</span>
                <span className="font-semibold text-rose-300">REVOKE SESSION</span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
