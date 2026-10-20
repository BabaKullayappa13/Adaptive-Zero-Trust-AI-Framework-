'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Radio,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Laptop
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminHeader from '@/components/admin/admin-header'
import { apiClient } from '@/lib/api'
import { formatTimestampIST } from '@/lib/date-utils'

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getAdminSessions()
      setSessions(res.data || [])
    } catch (err) {
      console.warn('Failed to load active sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <AdminHeader
              title="Active Zero-Trust Sessions"
              eyebrow="Continuous Authentication Monitoring"
              description="Live session telemetry, continuous risk evaluation, and step-up MFA indicators across active client devices."
              icon={Radio}
            >
              <button
                onClick={() => void fetchSessions()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Sessions
              </button>
            </AdminHeader>

            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Live Session Inventory</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {sessions.filter((s) => s.is_active).length} active sessions currently established
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Session ID</th>
                      <th className="px-5 py-3.5 font-semibold">User</th>
                      <th className="px-5 py-3.5 font-semibold">Trust Score</th>
                      <th className="px-5 py-3.5 font-semibold">Risk Score</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold">IP Address</th>
                      <th className="px-5 py-3.5 font-semibold">Started At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[.06]">
                    {sessions.length > 0 ? (
                      sessions.map((s) => (
                        <tr key={s.session_id} className="hover:bg-white/[.02]">
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                            #{s.session_id}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-cyan-300">
                            {s.email}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-emerald-400">
                            {s.trust_score?.toFixed(1) || '80.0'}
                          </td>
                          <td className="px-5 py-3.5 font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                s.risk_score >= 60
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : s.risk_score >= 30
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {s.risk_score?.toFixed(1) || '20.0'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {s.is_active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 font-semibold text-[11px]">
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[11px]">
                                Terminated
                              </span>
                            )}
                            {s.step_up_required && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px]">
                                <AlertTriangle className="size-2.5" /> Step-Up
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">
                            {s.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">
                            {formatTimestampIST(s.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                          {loading ? 'Loading active sessions...' : 'No active sessions detected.'}
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
