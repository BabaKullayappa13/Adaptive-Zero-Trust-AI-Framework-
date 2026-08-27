'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, CheckCircle2, Cpu, RefreshCw, Sparkles, Terminal } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import { apiClient } from '@/lib/api'

export default function AdminXAIPage() {
  const [xaiData, setXaiData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchXAI = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.explainDecision({
        decision: 'ALLOW_WITH_MONITORING',
        risk_score: 22.5,
        trust_score: 77.5,
        features: {
          keystroke_speed: 3.6,
          mouse_speed: 470.0,
          device_trust: 85.0,
          browser_changed: false,
          location_changed: false,
          ai_anomaly_score: 8.5
        }
      })
      setXaiData(res.data)
    } catch (err) {
      console.warn('Failed to load XAI data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchXAI()
  }, [fetchXAI])

  return (
    <>
      <AdminSessionGuard />
      <main className="soc-shell min-h-screen px-4 py-6 text-slate-100 sm:px-8 lg:px-16 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300">
            <ArrowLeft className="size-3.5" /> Back to Admin Console
          </Link>

          <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-violet-300">Explainable AI (XAI) Architecture</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Model Decision & Feature Attribution</h1>
              <p className="mt-2 text-sm text-slate-400">
                Technical SHAP-aligned mathematical attributions and decision tree paths for Isolation Forest anomaly scoring.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchXAI()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Recalculate Attributions
              </button>
              <AdminLogoutButton />
            </div>
          </header>

          {/* Model Specs */}
          <section className="grid gap-4 sm:grid-cols-4 mb-8">
            <div className="soc-panel p-5">
              <p className="eyebrow">Anomaly Model</p>
              <p className="mt-2 font-mono text-lg font-bold text-cyan-300">Isolation Forest</p>
              <p className="mt-1 text-xs text-slate-500">n_estimators=120</p>
            </div>
            <div className="soc-panel p-5">
              <p className="eyebrow">Explainability Kernel</p>
              <p className="mt-2 font-mono text-lg font-bold text-violet-300">TreeSHAP Approx</p>
              <p className="mt-1 text-xs text-slate-500">Dual-tier output</p>
            </div>
            <div className="soc-panel p-5">
              <p className="eyebrow">Evaluated Risk</p>
              <p className="mt-2 font-mono text-2xl font-bold text-emerald-300">{xaiData?.risk_score ?? 22.5}/100</p>
              <p className="mt-1 text-xs text-slate-500">Low Risk state</p>
            </div>
            <div className="soc-panel p-5">
              <p className="eyebrow">Calculated Trust</p>
              <p className="mt-2 font-mono text-2xl font-bold text-cyan-300">{xaiData?.trust_score ?? 77.5}/100</p>
              <p className="mt-1 text-xs text-slate-500">High Confidence</p>
            </div>
          </section>

          {/* Detailed Feature Importance Table */}
          <section className="soc-panel overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <h3 className="text-base font-semibold text-white">Mathematical Feature Attribution Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Feature Dimension</th>
                    <th className="px-5 py-3.5 font-semibold">Importance Weight</th>
                    <th className="px-5 py-3.5 font-semibold">SHAP Contribution</th>
                    <th className="px-5 py-3.5 font-semibold">Relative Impact (%)</th>
                    <th className="px-5 py-3.5 font-semibold">Direction</th>
                    <th className="px-5 py-3.5 font-semibold">Impact Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {xaiData?.feature_importance?.map((f: any) => (
                    <tr key={f.feature} className="hover:bg-white/[.02]">
                      <td className="px-5 py-3.5 font-semibold text-slate-200 capitalize">
                        {f.feature.replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {f.importance_weight}x
                      </td>
                      <td className="px-5 py-3.5 font-mono text-violet-300">
                        {f.shap_value}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-cyan-300">
                        {f.contribution_percent}%
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {f.direction}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 font-semibold uppercase text-[10px] ${
                          f.impact_level === 'high' ? 'bg-amber-400/10 text-amber-300' :
                          f.impact_level === 'medium' ? 'bg-cyan-400/10 text-cyan-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {f.impact_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
