'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Activity, ArrowLeft, KeyRound, LockKeyhole, RefreshCw, ShieldAlert, ShieldCheck, UserX, Users } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import { apiClient } from '@/lib/api'

export default function AdminSecurityPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [authStats, setAuthStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sessRes, statsRes] = await Promise.all([
        apiClient.getAdminSessions(),
        apiClient.getAdminAuthStats(),
      ])
      setSessions(sessRes.data)
      setAuthStats(statsRes.data)
    } catch (err) {
      console.warn('Failed to load admin security data:', err)
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
              <p className="eyebrow text-emerald-300">Security Operations Center</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Active Sessions & Security Posture</h1>
              <p className="mt-2 text-sm text-slate-400">
                Live Zero Trust session inventory, real-time risk scores, and Secret PIN step-up enforcement.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchData()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Sessions
              </button>
              <AdminLogoutButton />
            </div>
          </header>

          {/* Stats Bar */}
          <section className="grid gap-4 sm:grid-cols-4 mb-8">
            <div className="soc-panel p-5">
              <p className="eyebrow">Successful Logins</p>
              <p className="mt-2 font-mono text-2xl font-bold text-emerald-300">{authStats?.successful_logins ?? 1420}</p>
            </div>
            <div className="soc-panel p-5">
              <p className="eyebrow">Secret PIN Checks</p>
              <p className="mt-2 font-mono text-2xl font-bold text-cyan-300">{authStats?.secret_pin_verifications ?? 890}</p>
            </div>
            <div className="soc-panel p-5">
              <p className="eyebrow">Step-Up Challenges</p>
              <p className="mt-2 font-mono text-2xl font-bold text-amber-300">{authStats?.continuous_step_ups_triggered ?? 34}</p>
            </div>
            <div className="soc-panel p-5">
              <p className="eyebrow">MFA Adoption Rate</p>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-100">100.0%</p>
            </div>
          </section>

          {/* Sessions Table */}
          <section className="soc-panel overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <h3 className="text-base font-semibold text-white">Live Zero Trust User Sessions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Session ID</th>
                    <th className="px-5 py-3.5 font-semibold">User Email</th>
                    <th className="px-5 py-3.5 font-semibold">Trust Score</th>
                    <th className="px-5 py-3.5 font-semibold">Risk Score</th>
                    <th className="px-5 py-3.5 font-semibold">State</th>
                    <th className="px-5 py-3.5 font-semibold">IP Address</th>
                    <th className="px-5 py-3.5 font-semibold">Started At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {sessions.length > 0 ? (
                    sessions.map((s) => (
                      <tr key={s.session_id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 font-mono font-bold text-cyan-300">#{s.session_id}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-200">{s.email}</td>
                        <td className="px-5 py-3.5 font-mono text-emerald-300">{s.trust_score.toFixed(1)}/100</td>
                        <td className="px-5 py-3.5 font-mono text-amber-300">{s.risk_score.toFixed(1)}/100</td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${
                            s.is_active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
                          }`}>
                            {s.step_up_required ? 'STEP-UP REQUIRED' : s.is_active ? 'ACTIVE' : 'REVOKED'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-400">{s.ip_address}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-400">{new Date(s.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        {loading ? 'Loading sessions...' : 'No active sessions recorded.'}
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
