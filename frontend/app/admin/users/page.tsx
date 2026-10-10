'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  UserX,
  UserCheck,
  Ban,
  Clock,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import { apiClient } from '@/lib/api'

interface UserItem {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  mfa_enabled: boolean
  pin_configured: boolean
  is_suspended: boolean
  suspended_until?: string | null
  suspension_reason?: string | null
  is_blocked: boolean
  block_reason?: string | null
  passkey_enrolled?: boolean
  face_enrolled?: boolean
  last_login?: string
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modals state
  const [suspendModalUser, setSuspendModalUser] = useState<UserItem | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendHours, setSuspendHours] = useState(24)

  const [blockModalUser, setBlockModalUser] = useState<UserItem | null>(null)
  const [blockReason, setBlockReason] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getAdminUsers()
      setUsers(res.data || [])
    } catch (err) {
      console.warn('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text })
    setTimeout(() => setActionMsg(null), 5000)
  }

  // Suspend action
  const handleSuspend = async () => {
    if (!suspendModalUser) return
    if (!suspendReason.trim()) {
      showFeedback('error', 'A suspension reason is mandatory.')
      return
    }
    try {
      await apiClient.suspendAdminUser(suspendModalUser.id, {
        reason: suspendReason.trim(),
        duration_hours: suspendHours
      })
      showFeedback('success', `User ${suspendModalUser.email} has been suspended for ${suspendHours} hours.`)
      setSuspendModalUser(null)
      setSuspendReason('')
      void fetchUsers()
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.detail || 'Failed to suspend user.')
    }
  }

  // Restore action
  const handleRestore = async (u: UserItem) => {
    if (!confirm(`Restore ${u.email} to active status?`)) return
    try {
      await apiClient.restoreAdminUser(u.id)
      showFeedback('success', `User ${u.email} has been restored.`)
      void fetchUsers()
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.detail || 'Failed to restore user.')
    }
  }

  // Block action
  const handleBlock = async () => {
    if (!blockModalUser) return
    if (!blockReason.trim()) {
      showFeedback('error', 'A reason is required to block an account.')
      return
    }
    try {
      await apiClient.blockAdminUser(blockModalUser.id, {
        reason: blockReason.trim()
      })
      showFeedback('success', `User ${blockModalUser.email} has been blocked.`)
      setBlockModalUser(null)
      setBlockReason('')
      void fetchUsers()
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.detail || 'Failed to block user.')
    }
  }

  // Unblock action
  const handleUnblock = async (u: UserItem) => {
    if (!confirm(`Unblock ${u.email}?`)) return
    try {
      await apiClient.unblockAdminUser(u.id)
      showFeedback('success', `User ${u.email} has been unblocked.`)
      void fetchUsers()
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.detail || 'Failed to unblock user.')
    }
  }

  // Revoke sessions
  const handleRevokeSessions = async (u: UserItem) => {
    if (!confirm(`Revoke all active sessions for ${u.email}?`)) return
    try {
      await apiClient.revokeAdminUserSessions(u.id)
      showFeedback('success', `Active sessions for ${u.email} revoked.`)
    } catch (err: any) {
      showFeedback('error', 'Failed to revoke user sessions.')
    }
  }

  // Delete user
  const handleDelete = async (u: UserItem) => {
    if (!confirm(`PERMANENT ACTION: Delete user ${u.email}? This cannot be undone.`)) return
    try {
      await apiClient.deleteAdminUser(u.id)
      showFeedback('success', `User ${u.email} deleted successfully.`)
      void fetchUsers()
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.detail || 'Failed to delete user account.')
    }
  }

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
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
                <p className="eyebrow text-cyan-400">Identity Governance & Lifecycle Control</p>
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                  <Users className="size-8 text-cyan-400" />
                  Users & Identity Governance
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Manage registered operators, enforce suspension and block states, review MFA enrollments, and revoke sessions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void fetchUsers()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
                >
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Directory
                </button>
              </div>
            </header>

            {actionMsg && (
              <div
                className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
                  actionMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {actionMsg.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                {actionMsg.text}
              </div>
            )}

            {/* Users Directory Table */}
            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Registered Accounts</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {users.length} enrolled accounts in authoritative database
                  </p>
                </div>
                <div className="relative max-w-xs w-full">
                  <Search className="size-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by email, name, role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Identity</th>
                      <th className="px-5 py-3.5 font-semibold">Role</th>
                      <th className="px-5 py-3.5 font-semibold">Account State</th>
                      <th className="px-5 py-3.5 font-semibold">MFA Enrolled</th>
                      <th className="px-5 py-3.5 font-semibold">Last Login</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[.06]">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[.02]">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-200">{u.name || 'Operator'}</p>
                            <p className="font-mono text-cyan-300 text-[11px]">{u.email}</p>
                          </td>
                          <td className="px-5 py-3.5 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              u.role === 'admin' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {u.is_blocked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-[11px]">
                                <Ban className="size-3" /> Blocked
                              </span>
                            ) : u.is_suspended ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[11px]">
                                <Clock className="size-3" /> Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                                <ShieldCheck className="size-3" /> Active
                              </span>
                            )}
                            {u.suspension_reason && (
                              <p className="text-[10px] text-amber-400/80 mt-1 truncate max-w-xs">
                                {u.suspension_reason}
                              </p>
                            )}
                            {u.block_reason && (
                              <p className="text-[10px] text-rose-400/80 mt-1 truncate max-w-xs">
                                {u.block_reason}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {u.pin_configured && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                                  <KeyRound className="size-2.5" /> PIN
                                </span>
                              )}
                              {u.passkey_enrolled && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px]">
                                  Passkey
                                </span>
                              )}
                              {u.face_enrolled && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px]">
                                  Face ID
                                </span>
                              )}
                              {!u.pin_configured && !u.passkey_enrolled && !u.face_enrolled && (
                                <span className="text-[10px] text-slate-500">None</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">
                            {u.last_login && u.last_login !== 'Never'
                              ? new Date(u.last_login).toLocaleString()
                              : 'Never'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Suspend / Restore */}
                              {u.is_suspended ? (
                                <button
                                  onClick={() => void handleRestore(u)}
                                  className="px-2 py-1 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-[11px] transition"
                                >
                                  Restore
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSuspendModalUser(u)}
                                  className="px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-[11px] transition"
                                >
                                  Suspend
                                </button>
                              )}

                              {/* Block / Unblock */}
                              {u.is_blocked ? (
                                <button
                                  onClick={() => void handleUnblock(u)}
                                  className="px-2 py-1 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 text-[11px] transition"
                                >
                                  Unblock
                                </button>
                              ) : (
                                <button
                                  onClick={() => setBlockModalUser(u)}
                                  className="px-2 py-1 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-[11px] transition"
                                >
                                  Block
                                </button>
                              )}

                              {/* Revoke Sessions */}
                              <button
                                onClick={() => void handleRevokeSessions(u)}
                                title="Revoke all active sessions"
                                className="p-1 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
                              >
                                <UserX className="size-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => void handleDelete(u)}
                                title="Delete user"
                                className="p-1 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                          {loading ? 'Loading user directory...' : 'No accounts matching search criteria.'}
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

      {/* Suspend User Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="size-5 text-amber-400" />
                Suspend Account: {suspendModalUser.email}
              </h3>
              <button
                onClick={() => setSuspendModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Suspended accounts cannot log in and will have all currently active sessions immediately terminated.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Suspension Duration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={suspendHours}
                  onChange={(e) => setSuspendHours(Number(e.target.value) || 24)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Reason
                </label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Unusual behavioral anomaly detected, awaiting security review..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspendModalUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSuspend()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {blockModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Ban className="size-5 text-rose-400" />
                Block Account: {blockModalUser.email}
              </h3>
              <button
                onClick={() => setBlockModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              Blocking is an indefinite administrative restriction. The account will not be allowed to log in until an administrator manually unblocks it.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Reason
              </label>
              <textarea
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Critical policy violation or compromised credentials..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setBlockModalUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleBlock()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-500 text-white hover:bg-rose-400 transition"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
