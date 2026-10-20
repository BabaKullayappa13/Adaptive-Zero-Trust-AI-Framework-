'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ClipboardList, Database, RefreshCw, ShieldCheck, Search,
  Filter, ArrowUpDown, ChevronLeft, ChevronRight, Clock,
  ShieldAlert, Activity, FileText
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminHeader from '@/components/admin/admin-header'
import { apiClient } from '@/lib/api'
import { formatTimestampIST } from '@/lib/date-utils'

const TIME_RANGES = [
  { id: '1h', label: '1 Hour' },
  { id: '1d', label: '1 Day' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' },
]

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [timeRange, setTimeRange] = useState('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getAuditLogs(undefined, 250, timeRange, sortOrder)
      setLogs(res.data || [])
    } catch (err) {
      console.warn('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange, sortOrder])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  // Extract unique action types for filter dropdown
  const uniqueActions = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => {
      const act = l.action_type || l.action
      if (act) set.add(act)
    })
    return Array.from(set).sort()
  }, [logs])

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const action = String(l.action_type || l.action || '').toLowerCase()
      const userId = String(l.user_id || '').toLowerCase()
      const ip = String(l.ip_address || '').toLowerCase()
      const logId = String(l.id || '').toLowerCase()
      const query = search.toLowerCase().trim()

      const matchesSearch = !query ||
        action.includes(query) ||
        userId.includes(query) ||
        ip.includes(query) ||
        logId.includes(query)

      const matchesAction = actionFilter === 'ALL' || (l.action_type || l.action) === actionFilter

      return matchesSearch && matchesAction
    })
  }, [logs, search, actionFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, actionFilter, timeRange])

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <AdminHeader
              title="System & Security Audit Logs"
              eyebrow="Administrative Audit Trail"
              description="Verifiable record of authentication attempts, lifecycle events, gateway access requests, step-up challenges, and policy decisions."
              icon={ClipboardList}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  title="Toggle Chronological Sort"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
                >
                  <ArrowUpDown className="size-3.5" />
                  {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                </button>
                <button
                  type="button"
                  onClick={() => void fetchLogs()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition disabled:opacity-50"
                >
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Trail
                </button>
              </div>
            </AdminHeader>

            {/* Time Filter & Quick Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-cyan-400" />
                  Period:
                </span>
                {TIME_RANGES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeRange(t.id)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      timeRange === t.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-slate-400">
                Display Timezone: <span className="text-cyan-300 font-semibold">Asia/Kolkata (IST, UTC+05:30)</span>
              </div>
            </div>

            {/* Period Statistics Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="soc-panel p-4">
                <p className="eyebrow text-slate-400">Total Events ({timeRange.toUpperCase()})</p>
                <p className="mt-1 text-2xl font-bold font-mono text-cyan-200">{filteredLogs.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Database recorded</p>
              </div>
              <div className="soc-panel p-4">
                <p className="eyebrow text-emerald-400/90">Access Granted / Normal</p>
                <p className="mt-1 text-2xl font-bold font-mono text-emerald-300">
                  {filteredLogs.filter(l => l.status === 'SUCCESS' || l.status === 'GRANTED' || l.status === 'ALLOW').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Zero-Trust verified</p>
              </div>
              <div className="soc-panel p-4">
                <p className="eyebrow text-amber-400/90">Step-Up / Challenged</p>
                <p className="mt-1 text-2xl font-bold font-mono text-amber-300">
                  {filteredLogs.filter(l => l.status === 'CHALLENGE' || l.status === 'STEP_UP_REQUIRED').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Adaptive policy challenge</p>
              </div>
              <div className="soc-panel p-4">
                <p className="eyebrow text-rose-400/90">High / Critical Risk</p>
                <p className="mt-1 text-2xl font-bold font-mono text-rose-300">
                  {filteredLogs.filter(l => l.risk_level === 'CRITICAL' || l.risk_level === 'HIGH').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Elevated risk posture</p>
              </div>
            </div>

            {/* Audit Log Table Container */}
            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-400" />
                    Immutable Event Trail
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {filteredLogs.length} of {logs.length} authoritative events loaded from database
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Action filter */}
                  {uniqueActions.length > 0 && (
                    <div className="relative">
                      <select
                        aria-label="Filter by Action Type"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 pr-8"
                      >
                        <option value="ALL">All Actions ({logs.length})</option>
                        {uniqueActions.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative max-w-xs w-full">
                    <Search className="size-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search action, user, IP, ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400 text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Log ID</th>
                      <th className="px-5 py-3.5 font-semibold">Action Type</th>
                      <th className="px-5 py-3.5 font-semibold">Subject / User</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold">Risk Level</th>
                      <th className="px-5 py-3.5 font-semibold">IP Address</th>
                      <th className="px-5 py-3.5 font-semibold">Recorded At (IST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[.06]">
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => {
                        const rawTimestamp = log.recorded_at || log.created_at || log.timestamp
                        const formattedTimestamp = formatTimestampIST(rawTimestamp)
                        const actionName = log.action_type || log.action || 'UNKNOWN'

                        return (
                          <tr key={log.id} className="hover:bg-white/[.02] transition">
                            <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                              {log.id ? String(log.id).substring(0, 8) : '—'}...
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-200">
                              <span className="font-mono text-cyan-200">{actionName}</span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-300">
                              {log.user_id ? String(log.user_id).substring(0, 16) : 'system'}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold text-[10px] ${
                                  log.status === 'SUCCESS' || log.status === 'GRANTED' || log.status === 'ALLOW'
                                    ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-500/20'
                                    : log.status === 'CHALLENGE' || log.status === 'STEP_UP_REQUIRED'
                                    ? 'bg-amber-400/10 text-amber-300 border border-amber-500/20'
                                    : 'bg-rose-400/10 text-rose-300 border border-rose-500/20'
                                }`}
                              >
                                {log.status === 'SUCCESS' || log.status === 'GRANTED' || log.status === 'ALLOW' ? (
                                  <ShieldCheck className="size-3" />
                                ) : (
                                  <Database className="size-3" />
                                )}
                                {log.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  log.risk_level === 'CRITICAL' || log.risk_level === 'HIGH'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : log.risk_level === 'MEDIUM'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {log.risk_level || 'LOW'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-400">
                              {log.ip_address || '127.0.0.1'}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-300 font-medium">
                              {formattedTimestamp}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="size-4 animate-spin text-cyan-400" />
                              <span>Loading authoritative audit trail from database...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <ShieldAlert className="size-6 text-slate-600" />
                              <p className="font-semibold text-slate-400">No audit records match the current filter.</p>
                              <p className="text-xs text-slate-600">Try adjusting your date range or search query.</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} events
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40 transition"
                    >
                      <ChevronLeft className="size-3.5" /> Previous
                    </button>
                    <span className="font-mono text-cyan-300 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40 transition"
                    >
                      Next <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  )
}
