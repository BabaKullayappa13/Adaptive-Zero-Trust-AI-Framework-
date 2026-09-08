'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, AlertCircle, Bell, CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import Navbar from '@/components/navbar'
import SecurityOverview, { SecurityOverviewData } from '@/components/dashboard/security-overview'

export default function DashboardPage() {
  const router = useRouter()
  const { user, accessToken, isInitialized, logout, loadUser } = useAuthStore()
  const [summary, setSummary] = useState<SecurityOverviewData | null>(null)
  const [trustScore, setTrustScore] = useState<{ score: number; factors?: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [xaiSummary, setXaiSummary] = useState<{
    decision: string
    explanation: string
    factors: Array<{ factor: string; impact: string; weight: number }>
    action: string
  } | null>(null)

  useEffect(() => { void loadUser() }, [loadUser])
  useEffect(() => {
    if (isInitialized && (!user || !accessToken)) router.replace('/auth/login')
  }, [user, accessToken, isInitialized, router])

  const loadDashboard = useCallback(async (isRetry = false) => {
    if (!user) return
    if (isRetry) {
      setRetrying(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const [summaryResponse, scoreResponse] = await Promise.all([
        apiClient.getDashboardSummary(),
        apiClient.getTrustScore(user.id),
      ])
      setSummary(summaryResponse.data)
      setTrustScore(scoreResponse.data)
      if (isRetry) {
        setFeedback({ type: 'success', message: 'Security telemetry refreshed successfully.' })
        setTimeout(() => setFeedback(null), 4000)
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        setError('Authentication credentials required. Please log in to view security telemetry.')
      } else if (!err?.response) {
        setError('Security telemetry is unavailable. Check the backend service and retry.')
      } else {
        setError(getApiErrorMessage(err, 'Security telemetry is unavailable. Check the backend service and retry.'))
      }
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }, [user])

  useEffect(() => {
    if (user) void loadDashboard()
  }, [user, loadDashboard])

  const handleRecalculate = async () => {
    if (!user || recalculating) return
    setRecalculating(true)
    setFeedback(null)

    try {
      const resp = await apiClient.recalculateSecurity({ user_id: user.id })
      const data = resp.data

      if (typeof data.trust_score === 'number') {
        setTrustScore({
          score: data.trust_score,
          factors: data.feature_contributions || {
            device_trust: 85,
            behavior_consistency: 80,
            session_stability: 90,
            secret_pin_authenticated: 95,
          },
        })
      }

      if (data.explanation || data.contributing_factors) {
        const factorsList = Array.isArray(data.contributing_factors)
          ? data.contributing_factors.map((f: any) =>
              typeof f === 'string'
                ? { factor: f, impact: 'MODERATE', weight: 0.2 }
                : { factor: f.factor || f.name, impact: f.impact || 'MODERATE', weight: f.weight || 0.2 }
            )
          : []
        setXaiSummary({
          decision: data.decision || 'ALLOW_WITH_MONITORING',
          explanation: data.explanation || 'Zero Trust posture recalculated from live telemetry.',
          factors: factorsList,
          action: data.action_required || 'CONTINUOUS_MONITORING',
        })
      }

      // Refresh events from summary
      const summaryResp = await apiClient.getDashboardSummary().catch(() => null)
      if (summaryResp?.data) {
        setSummary(summaryResp.data)
      }

      setFeedback({
        type: 'success',
        message: `Dynamic risk & trust recalculated: Trust ${Math.round(data.trust_score)}/100, Decision: ${data.decision}.`,
      })
      setTimeout(() => setFeedback(null), 6000)
    } catch (err) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(err, 'Unable to recalculate security risk. Please try again.'),
      })
    } finally {
      setRecalculating(false)
    }
  }

  if (!isInitialized || !user || !accessToken) return <div className="min-h-screen bg-[#060b14]" />

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user} onLogout={logout} />
      <main className="mx-auto flex max-w-[1480px] flex-col gap-8 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10 lg:pb-10">
        <header className="reveal relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.08] via-slate-950/50 to-violet-400/[.08] px-5 py-7 shadow-2xl shadow-slate-950/30 sm:px-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <ShieldCheck className="size-4" />
                Adaptive Zero Trust AI
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                Security operations center
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Continuous authentication, adaptive policy enforcement, and explainable risk intelligence.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-300">
                <span className="size-2 animate-pulse rounded-full bg-emerald-300" />
                Operational
              </span>
              <button
                type="button"
                onClick={() => void handleRecalculate()}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/20 disabled:cursor-wait disabled:opacity-60"
                disabled={recalculating || loading}
                title="Trigger dynamic AI risk & trust recalculation across behavioral and ML engines"
              >
                <Sparkles className={`size-4 ${recalculating ? 'animate-spin text-cyan-300' : 'text-cyan-300'}`} />
                {recalculating ? 'Recalculating...' : 'Recalculate Risk & Explain'}
              </button>
              <button
                type="button"
                onClick={() => void loadDashboard(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-300/30 hover:bg-white/[.08] disabled:cursor-wait disabled:opacity-60"
                disabled={loading || retrying}
                title="Refresh dashboard telemetry from database"
              >
                <RefreshCw className={`size-4 ${loading && !retrying ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {feedback && (
          <div
            role="status"
            className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                : 'border-rose-400/30 bg-rose-400/10 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="size-5 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {error && (
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-400/20 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/30 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {xaiSummary && (
          <div className="soc-panel border-cyan-400/30 bg-cyan-950/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-cyan-200">Live AI Recalculation Intelligence</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Decision: {xaiSummary.decision}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{xaiSummary.explanation}</p>
                {xaiSummary.factors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contributing Factors:</p>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {xaiSummary.factors.map((f, i) => (
                        <li key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                          <span className="text-slate-300">{f.factor}</span>
                          <span className="font-mono text-cyan-300">{f.impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Recommended Action: <span className="font-semibold text-cyan-200">{xaiSummary.action}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setXaiSummary(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {loading && !summary && (
          <div className="grid gap-6 lg:grid-cols-2" role="status" aria-label="Loading security telemetry">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-44 animate-pulse rounded-xl border border-white/10 bg-white/[.03]" key={item} />
            ))}
          </div>
        )}

        {summary && <SecurityOverview data={summary} trustScore={trustScore} />}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <Activity className="size-3.5 text-cyan-300" />
            Telemetry is sourced from the FastAPI security service.
          </span>
          <span className="flex items-center gap-2">
            <Bell className="size-3.5" />
            No new critical alerts
          </span>
        </footer>
      </main>
    </div>
  )
}
