'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, AlertTriangle, ArrowLeft, CheckCircle2,
  Filter, KeyRound, LockKeyhole, RefreshCw, ShieldAlert,
  ShieldCheck, Sparkles, Terminal
} from 'lucide-react'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'

export default function PolicyAuditPage() {
  const { user, logout } = useAuthStore()
  const [timeRange, setTimeRange] = useState<string>('1d')
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL')
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        apiClient.getPolicyAuditLogs({
          time_range: timeRange,
          decision: decisionFilter === 'ALL' ? undefined : decisionFilter,
          limit: 50,
        }),
        apiClient.getPolicyAuditStats(timeRange),
      ])
      setLogs(logsRes.data?.logs || (Array.isArray(logsRes.data) ? logsRes.data : []))
      setStats(statsRes.data || null)
    } catch (err) {
      console.warn('[PolicyAuditPage] Error loading logs:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange, decisionFilter])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

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
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-cyan-300">
                Policy Engine {stats?.policy_version || 'v2.0.0'}
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                Zero-Trust Audited
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Policy Decision Audit Trail</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Immutable audit log of all access requests evaluated against Zero-Trust policy rules: Identity &middot; Secret PIN MFA &middot; Device Posture &middot; Continuous Risk &middot; Gateway Routing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time range selector */}
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
              onClick={() => void fetchData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200 disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {/* Audit Statistics Cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evaluated Requests</span>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{stats?.total_evaluations ?? 0}</p>
            <p className="text-[10px] text-slate-400">Policy rules triggered</p>
          </div>

          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Allowed Decisions</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{stats?.allowed ?? 0}</p>
            <p className="text-[10px] text-emerald-400/80">Authorized via policy</p>
          </div>

          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Challenged Decisions</span>
            <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{stats?.challenged ?? 0}</p>
            <p className="text-[10px] text-cyan-400/80">Step-up MFA required</p>
          </div>

          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Denied Decisions</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${stats?.denied > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {stats?.denied ?? 0}
            </p>
            <p className="text-[10px] text-slate-400">Policy violations blocked</p>
          </div>
        </section>

        {/* Decision Filter Pills: ALL / ALLOW / CHALLENGE / DENY */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold mr-1">Filter Decision:</span>
            {['ALL', 'ALLOW', 'CHALLENGE', 'DENY'].map((decision) => (
              <button
                key={decision}
                onClick={() => setDecisionFilter(decision)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  decisionFilter === decision
                    ? decision === 'ALLOW'
                      ? 'border border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
                      : decision === 'CHALLENGE'
                      ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-300'
                      : decision === 'DENY'
                      ? 'border border-rose-400/50 bg-rose-400/20 text-rose-300'
                      : 'border border-white/30 bg-white/10 text-white'
                    : 'border border-white/5 bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {decision}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Showing {logs.length} policy log records
          </span>
        </div>

        {/* Empty State */}
        {logs.length === 0 && !loading && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center space-y-2">
            <AlertTriangle className="size-8 mx-auto text-amber-400" />
            <h3 className="text-sm font-bold text-amber-200">Insufficient historical policy evaluations for this period.</h3>
            <p className="text-xs text-amber-300/80 max-w-md mx-auto">
              No policy evaluation records matching the filter were found. Execute an access request in the Hybrid Cloud Gateway or run a scenario from the Dashboard to record policy evaluations.
            </p>
          </div>
        )}

        {/* Policy Audit Logs Table */}
        <section className="soc-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                  <th className="px-5 py-3.5 font-semibold">Policy Name &amp; Ver</th>
                  <th className="px-5 py-3.5 font-semibold">Evaluated Resource</th>
                  <th className="px-5 py-3.5 font-semibold">Gateway Zone</th>
                  <th className="px-5 py-3.5 font-semibold">Decision</th>
                  <th className="px-5 py-3.5 font-semibold">Risk Score</th>
                  <th className="px-5 py-3.5 font-semibold">Policy Reason</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06]">
                {logs.length > 0 ? (
                  logs.map((log: any) => {
                    const isExpanded = expandedId === log.id
                    const dec = String(log.decision || '').toUpperCase()

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-white/[.02] transition-colors">
                          <td className="px-5 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-200">
                            <div>{log.policy_name}</div>
                            <span className="font-mono text-[10px] text-cyan-300">{log.policy_version || 'v2.0.0'}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-300">
                            {log.requested_resource}
                          </td>
                          <td className="px-5 py-3.5 capitalize text-slate-300">
                            {log.gateway_environment || 'hybrid'}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                dec === 'ALLOW'
                                  ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                  : dec === 'CHALLENGE'
                                  ? 'border border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                                  : 'border border-rose-400/30 bg-rose-400/10 text-rose-300'
                              }`}
                            >
                              <span className="size-1 rounded-full bg-current" />
                              {dec}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-semibold text-amber-300">
                            {Math.round(log.risk_score || 0)}/100
                          </td>
                          <td className="px-5 py-3.5 text-slate-300 max-w-[240px] truncate" title={log.reason}>
                            {log.reason}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="rounded px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/10 transition"
                            >
                              {isExpanded ? 'Hide' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-950/60">
                            <td colSpan={8} className="px-5 py-4">
                              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 font-mono text-[11px] text-slate-300 space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                                  Policy Evaluation Context Snapshot
                                </p>
                                <pre className="overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(
                                    {
                                      id: log.id,
                                      policy_id: log.policy_id,
                                      policy_version: log.policy_version,
                                      mfa_status: log.mfa_status,
                                      device_status: log.device_status,
                                      input_context: log.input_context,
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
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      {loading ? 'Querying policy audit logs...' : 'No policy evaluation records.'}
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
