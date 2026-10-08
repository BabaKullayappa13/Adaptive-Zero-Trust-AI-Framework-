'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock,
  Filter, KeyRound, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, UserCheck
} from 'lucide-react'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'

export default function SecurityEventsPage() {
  const { user, logout } = useAuthStore()
  const [timeRange, setTimeRange] = useState<string>('1h')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.getSecurityEvents(timeRange, 50)
      setData(res.data)
    } catch (err: any) {
      console.warn('Failed to load security events:', err)
      setError(err?.response?.data?.detail || 'Unable to retrieve security events stream.')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const events = data?.events || []
  const metrics = data?.metrics || {
    total_events: 0,
    success_count: 0,
    failure_count: 0,
    challenged_count: 0,
    high_risk_count: 0,
  }

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
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="eyebrow text-cyan-300">Continuous Security Stream</p>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Live Security Events</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Audit stream of authentication actions, MFA challenges, risk scores, session locks, and Zero Trust policy evaluations. Backend authorization strictly isolates events to the authenticated account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Historical Filters: 1 Hour | 1 Day | 1 Month */}
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
              onClick={() => void fetchEvents()}
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

        {/* Real Metrics Summary Cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Period Events</span>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{metrics.total_events}</p>
            <p className="text-[10px] text-slate-400">{data?.period_label || 'Selected Period'}</p>
          </div>

          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Successful</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{metrics.success_count}</p>
            <p className="text-[10px] text-emerald-400/80">Authorized actions</p>
          </div>

          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Challenged (MFA)</span>
            <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{metrics.challenged_count}</p>
            <p className="text-[10px] text-cyan-400/80">Step-up verified</p>
          </div>

          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Failures / Denials</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${metrics.failure_count > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {metrics.failure_count}
            </p>
            <p className="text-[10px] text-slate-400">Policy violations</p>
          </div>

          <div className="soc-panel p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">High-Risk Events</span>
            <p className={`mt-1 font-mono text-2xl font-bold ${metrics.high_risk_count > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {metrics.high_risk_count}
            </p>
            <p className="text-[10px] text-slate-400">Risk &ge; 60%</p>
          </div>
        </section>

        {/* Insufficient Historical Data Alert */}
        {events.length === 0 && !loading && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center space-y-2">
            <AlertTriangle className="size-8 mx-auto text-amber-400" />
            <h3 className="text-sm font-bold text-amber-200">Insufficient historical data for this period.</h3>
            <p className="text-xs text-amber-300/80 max-w-md mx-auto">
              No security events were recorded during the previous {data?.period_label || 'selected rolling window'}. Metrics and logs update in real time as user and security operations occur.
            </p>
          </div>
        )}

        {/* Events Table */}
        <section className="soc-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                  <th className="px-5 py-3.5 font-semibold">Security Action</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Risk Level</th>
                  <th className="px-5 py-3.5 font-semibold">Trust State</th>
                  <th className="px-5 py-3.5 font-semibold">Source IP</th>
                  <th className="px-5 py-3.5 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06]">
                {events.length > 0 ? (
                  events.map((evt: any) => {
                    const isExpanded = expandedId === evt.id
                    const status = String(evt.status || '').toUpperCase()
                    const isSuccess = status === 'SUCCESS' || status === 'ALLOW'
                    const isChallenge = status === 'CHALLENGE' || status === 'CHALLENGED'

                    return (
                      <React.Fragment key={evt.id}>
                        <tr className="hover:bg-white/[.02] transition-colors">
                          <td className="px-5 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(evt.timestamp).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-100">
                            {String(evt.action || '').replace(/_/g, ' ')}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                isSuccess
                                  ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                  : isChallenge
                                  ? 'border border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                                  : 'border border-rose-400/30 bg-rose-400/10 text-rose-300'
                              }`}
                            >
                              <span className="size-1 rounded-full bg-current" />
                              {status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-200">
                            <span
                              className={
                                evt.risk_level === 'CRITICAL' || evt.risk_level === 'HIGH'
                                  ? 'text-rose-400'
                                  : evt.risk_level === 'MEDIUM'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {evt.risk_level || 'LOW'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
                            {evt.trust_level || 'NORMAL'}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">
                            {evt.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                              className="rounded px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/10 transition"
                            >
                              {isExpanded ? 'Hide' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-950/60">
                            <td colSpan={7} className="px-5 py-4">
                              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 font-mono text-[11px] text-slate-300">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-200">
                                  Event Inspection Trace
                                </p>
                                <pre className="overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(evt.details || {}, null, 2)}
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
                      {loading ? 'Querying security event stream...' : 'No security events for this time window.'}
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
