'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, RefreshCw, ShieldAlert, ShieldCheck, KeyRound, Radio } from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
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
      setSessions(sessRes.data || [])
      setAuthStats(statsRes.data || null)
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
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow text-emerald-300">Security Operations Center</p>
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                  <ShieldAlert className="size-8 text-rose-400" />
                  Live Threat Feed & Security Posture
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Live Zero Trust session inventory, real-time risk scores, and Secret PIN step-up enforcement.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void fetchData()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
                >
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Telemetry
                </button>
              </div>
            </header>

            {/* Stats Bar */}
            <section className="grid gap-4 sm:grid-cols-4">
              <div className="soc-panel p-5">
                <p className="eyebrow">Successful Logins</p>
                <p className="mt-2 font-mono text-2xl font-bold text-emerald-300">{authStats?.successful_logins ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">MFA Completed Logins</p>
              </div>
              <div className="soc-panel p-5">
                <p className="eyebrow">Secret PIN Checks</p>
                <p className="mt-2 font-mono text-2xl font-bold text-cyan-300">{authStats?.secret_pin_verifications ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">Zero-Knowledge Verification</p>
              </div>
              <div className="soc-panel p-5">
                <p className="eyebrow">Step-Up Challenges</p>
                <p className="mt-2 font-mono text-2xl font-bold text-amber-300">{authStats?.continuous_step_ups_triggered ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">Continuous Risk Elevation</p>
              </div>
              <div className="soc-panel p-5">
                <p className="eyebrow">MFA Adoption Rate</p>
                <p className="mt-2 font-mono text-2xl font-bold text-violet-300">{authStats?.mfa_adoption_rate_percent ?? 100.0}%</p>
                <p className="mt-1 text-xs text-slate-500">Enrolled Users</p>
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
                          <td className="px-5 py-3.5 font-mono text-emerald-300">{Number(s.trust_score || 50).toFixed(1)}/100</td>
                          <td className="px-5 py-3.5 font-mono text-amber-300">{Number(s.risk_score || 50).toFixed(1)}/100</td>
                          <td className="px-5 py-3.5">
                            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${
                              s.is_active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
                            }`}>
                              {s.step_up_required ? 'STEP-UP REQUIRED' : s.is_active ? 'ACTIVE' : 'REVOKED'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">{s.ip_address || '127.0.0.1'}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleString() : 'N/A'}</td>
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
      </div>
    </>
  )
}
