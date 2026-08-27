'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, ArrowRight, CheckCircle2, Cloud, Database, Globe2, LockKeyhole, Network, RefreshCw, Server, ShieldAlert, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { useContinuousAuth } from '@/components/continuous-auth-provider'
import { apiClient } from '@/lib/api'

export default function HybridCloudPage() {
  const { user, sessionId, logout } = useAuthStore()
  const { trustScore, riskScore } = useContinuousAuth()

  const [topology, setTopology] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedResource, setSelectedResource] = useState<string>('public-workload-api')
  const [targetCloud, setTargetCloud] = useState<string>('public')
  const [accessResult, setAccessResult] = useState<any>(null)
  const [evaluating, setEvaluating] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const topoRes = await apiClient.getCloudTopology()
      setTopology(topoRes.data)
    } catch (error) {
      console.error('Failed to fetch cloud data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleTestAccess = async () => {
    setEvaluating(true)
    try {
      const res = await apiClient.verifyCloudResourceAccess(selectedResource, targetCloud, sessionId || 1)
      setAccessResult(res.data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-cyan-300">Multi-Cloud Security Architecture</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Hybrid Cloud Zero Trust Gateway</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Logical separation between sensitive Private Cloud identity stores, public-facing compute workloads, and the continuous Zero Trust policy verification gateway.
            </p>
          </div>

          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Topology
          </button>
        </header>

        {/* 3-Tier Architecture Diagram */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Tier 1: Private Cloud */}
          <article className="soc-panel border-cyan-400/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="size-5 text-cyan-300" />
                <h2 className="text-base font-semibold text-white">Private Cloud Vault</h2>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                Tier 1 (Secure)
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Hosts sensitive user identity records, Secret PIN hashes (bcrypt), encryption keys, and master security policies.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2.5 text-slate-300">
                • DC-West Identity Cluster (Active)
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2.5 text-slate-300">
                • Secret PIN & MFA Auth Service
              </div>
            </div>
          </article>

          {/* Tier 2: Zero Trust Verification Gateway */}
          <article className="soc-panel border-emerald-400/30 bg-emerald-400/[.02] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LockKeyhole className="size-5 text-emerald-300" />
                <h2 className="text-base font-semibold text-white">Zero Trust Gateway</h2>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                Enforcement
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-300">
              Intercepts all cross-cloud access. Performs continuous behavioral telemetry evaluation, dynamic trust calculation, and adaptive step-up enforcement.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[.05] p-2.5 font-semibold text-emerald-200">
                • Mode: NEVER TRUST, ALWAYS VERIFY
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2.5 text-slate-300">
                • Current Session Trust: <strong>{trustScore.toFixed(1)}/100</strong>
              </div>
            </div>
          </article>

          {/* Tier 3: Public Cloud Workloads */}
          <article className="soc-panel border-violet-400/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="size-5 text-violet-300" />
                <h2 className="text-base font-semibold text-white">Public Cloud Workloads</h2>
              </div>
              <span className="rounded-full bg-violet-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
                Tier 3 (Edge)
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Hosts scalable public API endpoints, edge compute nodes, microservices, and client-facing web application containers.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2.5 text-slate-300">
                • AWS-East Application Cluster
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2.5 text-slate-300">
                • Edge API & Ingestion Gateways
              </div>
            </div>
          </article>
        </section>

        {/* Interactive Resource Access Gatekeeper Simulation */}
        <section className="soc-panel p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="eyebrow">Interactive Verification Simulation</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Test Hybrid Cloud Resource Access</h3>
              <p className="mt-1 text-xs text-slate-400">
                Simulate a live request across the Zero Trust Gateway to verify access permissions based on your current continuous risk state.
              </p>
            </div>
            <Network className="size-6 text-cyan-300" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Target Resource Identifier
                </label>
                <input
                  type="text"
                  value={selectedResource}
                  onChange={(e) => setSelectedResource(e.target.value)}
                  className="input"
                  placeholder="e.g. secure-financial-database or public-api-node"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Resource Cloud Zone
                </label>
                <select
                  value={targetCloud}
                  onChange={(e) => setTargetCloud(e.target.value)}
                  className="input bg-slate-900"
                >
                  <option value="public">Public Cloud (Requires Trust &gt; 45, Risk &lt; 65)</option>
                  <option value="private">Private Cloud Vault (Requires Trust &gt; 70, Risk &lt; 35)</option>
                </select>
              </div>

              <button
                onClick={handleTestAccess}
                disabled={evaluating}
                className="btn btn-primary w-full justify-center"
              >
                {evaluating ? 'Evaluating Zero Trust Gateway...' : 'Evaluate Access Request'}
                <ArrowRight className="size-4" />
              </button>
            </div>

            {/* Access Result Card */}
            <div className="rounded-xl border border-white/10 bg-white/[.02] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Gateway Decision Output</p>
              {accessResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Policy Verdict:</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      accessResult.decision === 'GRANTED' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' :
                      accessResult.decision === 'STEP_UP_REQUIRED' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                      'bg-rose-400/20 text-rose-300 border border-rose-400/30'
                    }`}>
                      {accessResult.decision}
                    </span>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-cyan-200">
                    {accessResult.workflow_trace}
                  </div>

                  <p className="text-xs text-slate-300">{accessResult.reason}</p>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-500">
                  Click &apos;Evaluate Access Request&apos; to test Zero Trust policy enforcement for this resource.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
