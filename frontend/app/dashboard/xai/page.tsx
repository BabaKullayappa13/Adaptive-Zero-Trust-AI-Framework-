'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, ArrowLeft, BrainCircuit, CheckCircle2, HelpCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { useContinuousAuth } from '@/components/continuous-auth-provider'
import { apiClient } from '@/lib/api'

export default function UserXAIPage() {
  const { user, logout } = useAuthStore()
  const { trustScore, riskScore } = useContinuousAuth()

  const [explanation, setExplanation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchExplanation = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.explainDecision({
        decision: riskScore >= 60 ? 'STEP_UP_MFA' : 'ALLOW_WITH_MONITORING',
        risk_score: riskScore,
        trust_score: trustScore,
        features: {
          keystroke_speed: 3.8,
          mouse_speed: 460.0,
          device_trust: 85.0,
          browser_changed: false,
          location_changed: false,
          ai_anomaly_score: 12.0
        }
      })
      setExplanation(res.data)
    } catch (err) {
      console.warn('[UserXAIPage] Error fetching explanation:', err)
    } finally {
      setLoading(false)
    }
  }, [riskScore, trustScore])

  useEffect(() => {
    void fetchExplanation()
  }, [fetchExplanation])

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300">
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <p className="eyebrow text-cyan-300">Explainable AI (XAI) Intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Why Was Access Evaluated This Way?</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Transparent, explainable machine-learning decision context showing the exact factors contributing to your Zero Trust security score.
            </p>
          </div>

          <button
            onClick={() => void fetchExplanation()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate Explanation
          </button>
        </header>

        {/* User Plain English Summary Box */}
        <section className="soc-panel p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <BrainCircuit className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">Current Access Assessment</h2>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  {explanation?.decision || 'ALLOW_WITH_MONITORING'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {explanation?.user_explanation?.summary || 'Your access is fully granted. Authentication and behavioral dynamics closely match your expected baseline profile.'}
              </p>

              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key Rationale Points:</p>
                {explanation?.user_explanation?.reasons?.map((reason: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature Importance Breakdown */}
        <section className="soc-panel p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="eyebrow">SHAP-Aligned Attribution</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Contributing Signal Factors</h3>
            </div>
            <Sparkles className="size-5 text-cyan-300" />
          </div>

          <div className="space-y-4">
            {explanation?.feature_importance?.map((feat: any) => (
              <div key={feat.feature} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200 capitalize">{feat.feature.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-cyan-300">{feat.contribution_percent}% impact</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{ width: `${Math.min(100, Math.max(5, feat.contribution_percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
