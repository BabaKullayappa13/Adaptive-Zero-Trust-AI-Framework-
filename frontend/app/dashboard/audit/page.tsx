'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, ClipboardList, Database, RefreshCw, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'

export default function UserAuditPage() {
  const { user, logout } = useAuthStore()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getAuditLogs(undefined, 50)
      setLogs(res.data)
    } catch (err) {
      console.warn('[AuditPage] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300">
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <p className="eyebrow text-cyan-300">Immutable Audit Trail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Security Audit Logs</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Complete verifiable log of authentication decisions, Secret PIN challenges, behavioral events, and policy actions.
            </p>
          </div>

          <button
            onClick={() => void fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Trail
          </button>
        </header>

        <section className="soc-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                  <th className="px-5 py-3.5 font-semibold">Action / Event</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Risk Level</th>
                  <th className="px-5 py-3.5 font-semibold">Trust Level</th>
                  <th className="px-5 py-3.5 font-semibold">IP Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06]">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[.02]">
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-200">
                        {log.action.replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-cyan-300">
                        {log.risk_level}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        {log.trust_level}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      {loading ? 'Loading audit records...' : 'No audit records found.'}
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
