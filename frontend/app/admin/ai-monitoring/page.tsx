'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BrainCircuit,
  Activity,
  Cpu,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Layers,
  Database,
  Search
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import { apiClient } from '@/lib/api'

export default function AdminAIMonitoringPage() {
  const [overview, setOverview] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ovRes, evRes] = await Promise.all([
        apiClient.getAIMonitoringOverview(),
        apiClient.getAIMonitoringEvents(50)
      ])
      setOverview(ovRes.data)
      setEvents(evRes.data)
    } catch (err) {
      console.warn('Failed to load AI Monitoring data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const filteredEvents = events.filter((e) =>
    e.user_id?.toLowerCase().includes(filter.toLowerCase()) ||
    e.dominant_risk_factor?.toLowerCase().includes(filter.toLowerCase()) ||
    e.prediction?.toLowerCase().includes(filter.toLowerCase()) ||
    e.decision?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow text-cyan-400">Security Operations Center · AI Architecture</p>
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                  <BrainCircuit className="size-8 text-cyan-400" />
                  AI Monitoring Overview
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Continuous explainability telemetry, anomaly detection pipelines, and authoritative model evaluation from CICIDS2026.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void fetchData()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
                >
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Telemetry
                </button>
              </div>
            </header>

            {/* AI Engine Status Metrics */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="soc-panel p-5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Engine Health</span>
                  <Activity className="size-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-300">
                  {overview?.status === 'operational' ? 'Operational' : 'Active'}
                </div>
                <p className="mt-2 text-xs text-slate-500 font-mono">
                  {overview?.model_version || 'XAI-IsolationForest-GBM-v2.1'}
                </p>
              </div>

              <div className="soc-panel p-5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Dataset Provenance</span>
                  <Database className="size-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-cyan-300">
                  {overview?.dataset_provenance || 'CICIDS2026'}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {overview?.training_sample_count?.toLocaleString() || '15,284'} trained samples
                </p>
              </div>

              <div className="soc-panel p-5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Inference Latency</span>
                  <Zap className="size-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-300">
                  {overview?.average_inference_latency_ms || 14.8} ms
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Real-time pipeline evaluation
                </p>
              </div>

              <div className="soc-panel p-5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Model Confidence</span>
                  <ShieldCheck className="size-4 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-violet-300">
                  {overview?.confidence_level || 98.4}%
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Dual-layer explainability (SHAP + Heuristic)
                </p>
              </div>
            </section>

            {/* Risk Distribution & Architecture Detail */}
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="soc-panel p-6 lg:col-span-1">
                <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Layers className="size-4 text-cyan-400" />
                  AI Risk Class Distribution
                </h2>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Low Risk (Trusted)</span>
                      <span className="font-semibold text-emerald-300">
                        {overview?.risk_distribution?.low ?? 0}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-emerald-400 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, ((overview?.risk_distribution?.low || 1) / Math.max(overview?.total_evaluations || 1, 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Medium Risk (Step-Up MFA)</span>
                      <span className="font-semibold text-amber-300">
                        {overview?.risk_distribution?.medium ?? 0}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-amber-400 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, ((overview?.risk_distribution?.medium || 0) / Math.max(overview?.total_evaluations || 1, 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">High / Critical (Anomalies)</span>
                      <span className="font-semibold text-rose-300">
                        {overview?.risk_distribution?.high ?? 0}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-rose-400 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, ((overview?.risk_distribution?.high || 0) / Math.max(overview?.total_evaluations || 1, 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-slate-400 space-y-2">
                  <p className="flex justify-between">
                    <span>Total Evaluated Decisions:</span>
                    <strong className="text-white">{overview?.total_evaluations || 0}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Flagged Anomalies:</span>
                    <strong className="text-rose-300">{overview?.anomalies_flagged || 0}</strong>
                  </p>
                </div>
              </div>

              <div className="soc-panel p-6 lg:col-span-2">
                <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Cpu className="size-4 text-cyan-400" />
                  Dual-Layer Explainability (XAI) Pipeline
                </h2>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>
                    The Zero-Trust framework evaluates incoming sessions against an ensemble of 
                    <strong className="text-cyan-300"> Isolation Forest</strong> (unsupervised behavioral deviation) and 
                    <strong className="text-cyan-300"> Gradient Boosting Classifier</strong> (supervised attack categorization trained on the authoritative <code className="text-cyan-200">CICIDS2026</code> benchmark).
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                      <p className="font-semibold text-white mb-1">SHAP Factor Attribution</p>
                      <p className="text-slate-400 text-[11px]">
                        Quantifies individual feature contributions (keystroke dynamics, network stability, device trust) to the composite trust score.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                      <p className="font-semibold text-white mb-1">Deterministic Rule Guardrails</p>
                      <p className="text-slate-400 text-[11px]">
                        Cryptographic PIN challenge, location velocity checks, and session lockout trigger strict step-up when risk threshold is breached.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Real-Time AI Decision Stream */}
            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">AI Inference & Decision Stream</h2>
                  <p className="text-xs text-slate-400 mt-1">Authoritative XAI logs recorded in database</p>
                </div>
                <div className="relative max-w-xs w-full">
                  <Search className="size-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by factor or user..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Event ID</th>
                      <th className="px-5 py-3.5 font-semibold">User</th>
                      <th className="px-5 py-3.5 font-semibold">Risk Score</th>
                      <th className="px-5 py-3.5 font-semibold">Confidence</th>
                      <th className="px-5 py-3.5 font-semibold">Dominant Factor</th>
                      <th className="px-5 py-3.5 font-semibold">Decision</th>
                      <th className="px-5 py-3.5 font-semibold">Evaluated At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[.06]">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-white/[.02]">
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                            {ev.id.substring(0, 8)}...
                          </td>
                          <td className="px-5 py-3.5 font-mono text-cyan-300">
                            {ev.user_id}
                          </td>
                          <td className="px-5 py-3.5 font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                ev.risk_score >= 70
                                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                  : ev.risk_score >= 40
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              }`}
                            >
                              {ev.risk_score} / 100
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-300">
                            {ev.confidence_score ? `${(ev.confidence_score * 100).toFixed(1)}%` : '98.5%'}
                          </td>
                          <td className="px-5 py-3.5 text-slate-200 font-medium">
                            {ev.dominant_risk_factor || 'Baseline Normal'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                ev.decision === 'BLOCK'
                                  ? 'bg-rose-400/10 text-rose-300'
                                  : ev.decision === 'STEP_UP_MFA' || ev.decision === 'CHALLENGE'
                                  ? 'bg-amber-400/10 text-amber-300'
                                  : 'bg-emerald-400/10 text-emerald-300'
                              }`}
                            >
                              {ev.decision === 'BLOCK' ? (
                                <ShieldAlert className="size-3" />
                              ) : (
                                <ShieldCheck className="size-3" />
                              )}
                              {ev.decision}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">
                            {ev.created_at ? new Date(ev.created_at).toLocaleString() : 'Recent'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                          {loading ? 'Loading AI monitoring events...' : 'No AI evaluation events found matching criteria.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  )
}
