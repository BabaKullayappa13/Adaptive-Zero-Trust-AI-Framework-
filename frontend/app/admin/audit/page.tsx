'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, Database, RefreshCw, ShieldCheck, Search } from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import { apiClient } from '@/lib/api'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getAuditLogs(undefined, 100)
      setLogs(res.data || [])
    } catch (err) {
      console.warn('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const filteredLogs = logs.filter((l) =>
    (l.action_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.user_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.ip_address || '').toLowerCase().includes(search.toLowerCase())
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
                <p className="eyebrow text-amber-300">Administrative Audit Trail</p>
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                  <ClipboardList className="size-8 text-amber-400" />
                  System & Security Audit Logs
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Verifiable record of authentication attempts, lifecycle events, Secret PIN verifications, step-up challenges, and policy events.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void fetchLogs()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
                >
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Trail
                </button>
              </div>
            </header>

            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Immutable Event Trail</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {logs.length} authoritative events loaded from database
                  </p>
                </div>
                <div className="relative max-w-xs w-full">
                  <Search className="size-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by action, user, or IP..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Log ID</th>
                      <th className="px-5 py-3.5 font-semibold">Action Type</th>
                      <th className="px-5 py-3.5 font-semibold">User</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold">Risk Level</th>
                      <th className="px-5 py-3.5 font-semibold">IP Address</th>
                      <th className="px-5 py-3.5 font-semibold">Recorded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[.06]">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[.02]">
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                            {log.id ? String(log.id).substring(0, 8) : ''}...
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-200">
                            {log.action_type}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-cyan-300">
                            {log.user_id ? String(log.user_id).substring(0, 12) : 'system'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-400/10 text-emerald-300'
                                  : 'bg-rose-400/10 text-rose-300'
                              }`}
                            >
                              {log.status === 'SUCCESS' ? (
                                <ShieldCheck className="size-3" />
                              ) : (
                                <Database className="size-3" />
                              )}
                              {log.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                log.risk_level === 'CRITICAL' || log.risk_level === 'HIGH'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : log.risk_level === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {log.risk_level || 'LOW'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                          {loading ? 'Loading audit trail from database...' : 'No audit records match the current filter.'}
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
