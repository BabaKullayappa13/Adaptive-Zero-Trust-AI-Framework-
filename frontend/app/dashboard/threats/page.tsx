'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, AlertTriangle, ArrowLeft, CheckCircle2,
  Clock, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Terminal, Zap
} from 'lucide-react'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'

export default function ThreatsPage() {
  const { user, logout } = useAuthStore()
  const [timeRange, setTimeRange] = useState<string>('1d')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchThreats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.getThreatIntelligence(timeRange)
      setData(res.data)
    } catch (err: any) {
      console.warn('[ThreatsPage] Error loading threats:', err)
      setError('Unable to load threat intelligence indicators.')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    void fetchThreats()
  }, [fetchThreats])

  const indicators = data?.threat_indicators || []
  const totalCount = data?.total_count || 0
  const activeCount = data?.active_threats || 0
  const criticalCount = data?.critical_severity || 0
  const highCount = data?.high_severity || 0

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300"
            >
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                Threat Intelligence Engine
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                Application-Derived Signals
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Active Threat Surface</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Correlated threat indicators derived from authentication telemetry, failed login spikes, impossible travel events, and anomalous kinematics. Zero fabricated feeds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
              {[
                { id: '1h', label: '1 Hour' },
                { id: '1d', label: '1 Day' },
                { id: '1m', label: '1 Month' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    timeRange === t.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => void fetchThreats()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200 disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Threat Summary Cards (Genuine Calculated Metrics) */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="soc-panel p-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Indicators</span>
            <p className="mt-2 font-mono text-3xl font-bold text-white">{totalCount}</p>
            <p className="mt-1 text-xs text-slate-500">Security event signals</p>
          </div>

          <div className="soc-panel p-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active Threats</span>
            <p className={`mt-2 font-mono text-3xl font-bold ${activeCount > 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
              {activeCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Unresolved indicators</p>
          </div>

          <div className="soc-panel p-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Critical Severity</span>
            <p className={`mt-2 font-mono text-3xl font-bold ${criticalCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {criticalCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Immediate action required</p>
          </div>

          <div className="soc-panel p-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">High Severity</span>
            <p className={`mt-2 font-mono text-3xl font-bold ${highCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {highCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Step-up challenges issued</p>
          </div>
        </section>

        {/* Origin Statement */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300 flex items-center gap-3">
          <ShieldAlert className="size-4 shrink-0 text-cyan-300" />
          <span>
            <strong>Data Lineage:</strong> {data?.derived_from || 'Application security events, anomalous behavioral telemetry, and authentication logs.'}
          </span>
        </div>

        {/* Empty State */}
        {indicators.length === 0 && !loading && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-2">
            <CheckCircle2 className="size-8 mx-auto text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-200">No active threat indicators detected.</h3>
            <p className="text-xs text-emerald-300/80 max-w-md mx-auto">
              Zero anomalous threat clusters or brute-force patterns identified in the selected period. Trigger the &quot;Suspicious Behavior&quot; scenario on the dashboard to test threat generation.
            </p>
          </div>
        )}

        {/* Threat Indicators Table */}
        <section className="soc-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Detected At</th>
                  <th className="px-5 py-3.5 font-semibold">Threat Indicator</th>
                  <th className="px-5 py-3.5 font-semibold">Severity</th>
                  <th className="px-5 py-3.5 font-semibold">Origin IP</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Policy Response</th>
                  <th className="px-5 py-3.5 font-semibold">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06]">
                {indicators.length > 0 ? (
                  indicators.map((ind: any) => {
                    const isExpanded = expandedId === ind.id
                    const sev = String(ind.severity || '').toUpperCase()

                    return (
                      <React.Fragment key={ind.id}>
                        <tr className="hover:bg-white/[.02] transition-colors">
                          <td className="px-5 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(ind.detected_at).toLocaleTimeString()}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-100">
                            {ind.indicator_type.replace(/_/g, ' ')}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                sev === 'CRITICAL'
                                  ? 'border border-rose-400/40 bg-rose-400/10 text-rose-300'
                                  : sev === 'HIGH'
                                  ? 'border border-amber-400/40 bg-amber-400/10 text-amber-300'
                                  : 'border border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                              }`}
                            >
                              <span className="size-1 rounded-full bg-current" />
                              {sev}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">
                            {ind.source_ip}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap font-mono">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                ind.status === 'ACTIVE'
                                  ? 'bg-rose-400/20 text-rose-300'
                                  : 'bg-emerald-400/20 text-emerald-300'
                              }`}
                            >
                              {ind.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300 max-w-[240px] truncate">
                            {ind.details?.reason || 'Require Step-Up MFA Challenge'}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : ind.id)}
                              className="rounded px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/10 transition"
                            >
                              {isExpanded ? 'Hide' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-950/60">
                            <td colSpan={7} className="px-5 py-4">
                              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 font-mono text-[11px] text-slate-300 space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                                  Threat Indicator Context Snapshot
                                </p>
                                <pre className="overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(
                                    {
                                      id: ind.id,
                                      indicator_type: ind.indicator_type,
                                      user_id: ind.user_id,
                                      details: ind.details,
                                      detected_at: ind.detected_at,
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      {loading ? 'Querying threat intelligence stream...' : 'No indicators recorded.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
