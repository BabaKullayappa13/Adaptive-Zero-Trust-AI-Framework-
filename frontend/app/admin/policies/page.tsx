'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, LockKeyhole, Plus, RefreshCw, Settings2, ShieldAlert } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import { apiClient } from '@/lib/api'

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [policyName, setPolicyName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(10)
  const [creating, setCreating] = useState(false)

  const fetchPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getActivePolicies()
      setPolicies(res.data)
    } catch (err) {
      console.warn('Failed to load policies:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPolicies()
  }, [fetchPolicies])

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!policyName) return

    setCreating(true)
    try {
      await apiClient.createPolicy(policyName, description, 'adaptive_mfa', Number(priority))
      setShowModal(false)
      setPolicyName('')
      setDescription('')
      await fetchPolicies()
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

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
              <p className="eyebrow text-cyan-300">Access Governance</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Zero Trust Policy Management</h1>
              <p className="mt-2 text-sm text-slate-400">
                Configure adaptive authorization rules, Secret PIN challenge triggers, and session termination thresholds.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchPolicies()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                <Plus className="size-4" />
                Add Policy
              </button>
              <AdminLogoutButton />
            </div>
          </header>

          <section className="space-y-4">
            {policies.map((p) => (
              <article key={p.policy_id} className="soc-panel p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <LockKeyhole className="size-4 text-cyan-300" />
                      <h2 className="text-base font-semibold text-white">{p.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                      Priority {p.priority}
                    </span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      Active
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rules in Policy:</p>
                  {p.rules?.map((r: any) => (
                    <div key={r.rule_id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.02] p-3 text-xs">
                      <span className="font-semibold text-slate-200">{r.rule_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Condition: {r.condition_type}</span>
                        <span className="rounded bg-cyan-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                          {r.action.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          {/* New Policy Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">Create New Zero Trust Policy</h3>
                <form onSubmit={handleCreatePolicy} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Policy Name
                    </label>
                    <input
                      type="text"
                      value={policyName}
                      onChange={(e) => setPolicyName(e.target.value)}
                      placeholder="e.g. Critical High-Security Cloud Vault Policy"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Policy enforcement parameters and risk thresholds"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Priority (Lower = Evaluated First)
                    </label>
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="input"
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="btn btn-primary text-xs"
                    >
                      {creating ? 'Saving...' : 'Save Policy'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
