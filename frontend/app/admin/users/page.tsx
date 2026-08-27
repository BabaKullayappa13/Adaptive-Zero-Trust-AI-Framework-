'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, KeyRound, Lock, RefreshCw, ShieldCheck, UserCheck, Users, XCircle } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import { apiClient } from '@/lib/api'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getAdminUsers()
      setUsers(res.data)
    } catch (err) {
      console.warn('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

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
              <p className="eyebrow text-cyan-300">Identity & Credential Management</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Registered Users & MFA Posture</h1>
              <p className="mt-2 text-sm text-slate-400">
                Directory of enrolled identities, Secret PIN security configuration, and last active authentication timestamps.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchUsers()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Directory
              </button>
              <AdminLogoutButton />
            </div>
          </header>

          <section className="soc-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">User ID</th>
                    <th className="px-5 py-3.5 font-semibold">Name / Role</th>
                    <th className="px-5 py-3.5 font-semibold">Email</th>
                    <th className="px-5 py-3.5 font-semibold">Secret PIN (MFA)</th>
                    <th className="px-5 py-3.5 font-semibold">Last Authentication</th>
                    <th className="px-5 py-3.5 font-semibold">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                          {u.id.substring(0, 8)}...
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-200">
                          {u.name}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-cyan-300">
                          {u.email}
                        </td>
                        <td className="px-5 py-3.5">
                          {u.pin_configured ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-0.5 font-semibold text-emerald-300">
                              <KeyRound className="size-3" /> Configured (Bcrypt)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-slate-400">
                              <XCircle className="size-3" /> Not Set
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-400">
                          {u.last_login !== 'Never' ? new Date(u.last_login).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        {loading ? 'Loading user directory...' : 'No users enrolled.'}
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
