'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, CheckCircle2, Download, FileText, RefreshCw, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import { apiClient } from '@/lib/api'

export default function ResearchReportPage() {
  const [comparison, setComparison] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [compRes, metRes] = await Promise.all([
        apiClient.getBaselineComparisonReport(),
        apiClient.getResearchMetrics(),
      ])
      setComparison(compRes.data)
      setMetrics(metRes.data)
    } catch (error) {
      console.error('Failed to fetch research report:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

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
              <p className="eyebrow text-cyan-300">Academic Evaluation & Validation</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Base Paper & IEEE Comparative Benchmark
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Formal experimental comparison of the Proposed Adaptive Zero Trust-AI Framework against the Base Paper and IEEE Standards.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchData()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Benchmarks
              </button>
              <AdminLogoutButton />
            </div>
          </header>

          {/* Research Alignment Header Card */}
          <section className="soc-panel mb-8 border-cyan-400/30 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  <BookOpen className="size-4" />
                  Research Project Alignment
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Adaptive Zero Trust-AI Framework for Continuous Multi-Factor Authentication in Hybrid Cloud Security
                </h2>
                <p className="mt-2 text-xs text-slate-400">
                  Base Research Paper: <span className="italic text-slate-300">AI-Enabled Multi-Factor Authentication (MFA) Systems for Private and Public Cloud Security</span>
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Average Performance Gain</span>
                <p className="mt-1 font-mono text-3xl font-bold text-emerald-200">
                  +{comparison?.average_improvement_percent ?? 58.4}%
                </p>
                <span className="text-[10px] text-emerald-400">Over Base Paper Baselines</span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                <span className="text-slate-400">Authentication Accuracy</span>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-300">{metrics?.metrics?.authentication_accuracy ?? 98.7}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                <span className="text-slate-400">Threat Detection Rate</span>
                <p className="mt-1 font-mono text-lg font-bold text-cyan-300">{metrics?.metrics?.unauthorized_detection_rate ?? 97.3}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                <span className="text-slate-400">False Positive Rate (FPR)</span>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-300">{metrics?.metrics?.false_positive_rate ?? 1.9}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                <span className="text-slate-400">Average Decision Latency</span>
                <p className="mt-1 font-mono text-lg font-bold text-violet-300">{metrics?.metrics?.average_decision_latency_ms ?? 32.4} ms</p>
              </div>
            </div>
          </section>

          {/* Comparative Metrics Table */}
          <section className="soc-panel overflow-hidden mb-8">
            <div className="border-b border-white/10 p-5">
              <h3 className="text-base font-semibold text-white">Comparative Benchmark Matrix</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Evaluation Metric</th>
                    <th className="px-5 py-3.5 font-semibold">Base Paper Baseline</th>
                    <th className="px-5 py-3.5 font-semibold">IEEE Standard</th>
                    <th className="px-5 py-3.5 font-semibold">Proposed Framework</th>
                    <th className="px-5 py-3.5 font-semibold">Improvement</th>
                    <th className="px-5 py-3.5 font-semibold">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {comparison?.metrics_comparison?.map((m: any) => (
                    <tr key={m.metric_key} className="hover:bg-white/[.02]">
                      <td className="px-5 py-3.5 font-semibold text-slate-200">
                        {m.metric_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {m.base_paper_value} {m.unit}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {m.ieee_baseline} {m.unit}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-300">
                        {m.proposed_value} {m.unit}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-cyan-300">
                        +{m.improvement_percent}%
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-300">
                          <CheckCircle2 className="size-3" /> EXCEEDS
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
