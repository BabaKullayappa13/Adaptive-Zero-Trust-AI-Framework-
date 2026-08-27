'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, LockKeyhole, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'

export default function UserPoliciesPage() {
  const { user, logout } = useAuthStore()
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPolicies = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getActivePolicies()
      setPolicies(res.data)
    } catch (err) {
      console.warn('[PoliciesPage] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPolicies()
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
            <p className="eyebrow text-cyan-300">Zero Trust Policy Enforcement</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Access & Continuous Security Policies</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Active Zero Trust policy framework evaluated against contextual risk, identity credentials, Secret PIN challenges, and behavioral metrics.
            </p>
          </div>

          <button
            onClick={() => void fetchPolicies()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Policies
          </button>
        </header>

        <section className="space-y-4">
          {policies.map((policy) => (
            <article key={policy.policy_id} className="soc-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <LockKeyhole className="size-4 text-cyan-300" />
                    <h2 className="text-base font-semibold text-white">{policy.name}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{policy.description || 'Continuous dynamic policy enforcement'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                    Priority {policy.priority}
                  </span>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    Active
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Associated Rules:</p>
                {policy.rules?.map((rule: any) => (
                  <div key={rule.rule_id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.02] p-3 text-xs">
                    <span className="font-semibold text-slate-200">{rule.rule_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Condition: {rule.condition_type}</span>
                      <span className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                        rule.severity === 'critical' ? 'bg-rose-400/10 text-rose-300' :
                        rule.severity === 'high' ? 'bg-amber-400/10 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'
                      }`}>
                        {rule.action.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
