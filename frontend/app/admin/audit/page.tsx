'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Database, RefreshCw, ShieldCheck } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import { apiClient } from '@/lib/api'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getAuditLogs(undefined, 100)
      setLogs(res.data)
    } catch (err) {
      console.warn('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

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
              <p className="eyebrow text-amber-300">Administrative Audit Trail</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">System & Security Audit Logs</h1>
              <p className="mt-2 text-sm text-slate-400">
                Verifiable record of authentication attempts, Secret PIN verifications, step-up challenges, and policy events.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchLogs()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Trail
              </button>
              <AdminLogoutButton />
            </div>
          </header>

          <section className="soc-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                    <th className="px-5 py-3.5 font-semibold">Event Action</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Risk Level</th>
                    <th className="px-5 py-3.5 font-semibold">Trust Level</th>
                    <th className="px-5 py-3.5 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {logs.length > 0 ? (
                    logs.map((l) => (
                      <tr key={l.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 font-mono text-slate-400">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-200">
                          {l.action.replace(/_/g, ' ')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                            l.status === 'SUCCESS' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-cyan-300">
                          {l.risk_level}
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">
                          {l.trust_level}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-400">
                          {l.ip_address}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        {loading ? 'Loading audit logs...' : 'No audit records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
