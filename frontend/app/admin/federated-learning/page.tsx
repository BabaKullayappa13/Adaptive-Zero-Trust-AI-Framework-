'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Cpu, Database, Network, Play, RefreshCw, Server, ShieldCheck } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'
import AdminSessionGuard from '@/components/admin-session-guard'
import { apiClient } from '@/lib/api'

export default function AdminFederatedLearningPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [training, setTraining] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getFederatedHistory(15)
      setHistory(res.data)
    } catch (err) {
      console.warn('Failed to load FL history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleRunRound = async () => {
    setTraining(true)
    try {
      await apiClient.triggerFederatedRound()
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setTraining(false)
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
              <p className="eyebrow text-emerald-300">Decentralized Machine Learning Simulation</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Federated Learning Simulation for Privacy-Preserving Authentication Model Improvement
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Manage and trigger FedAvg simulation rounds across Private Cloud (DC-West), Public Cloud (AWS-East), and Edge Gateway clients.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void fetchData()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleRunRound}
                disabled={training}
                className="btn btn-primary"
              >
                <Play className={`size-3.5 ${training ? 'animate-spin' : ''}`} />
                {training ? 'Aggregating...' : 'Trigger Simulation Round'}
              </button>
              <AdminLogoutButton />
            </div>
          </header>

          <section className="soc-panel overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <h3 className="text-base font-semibold text-white">Simulation Rounds Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Round</th>
                    <th className="px-5 py-3.5 font-semibold">Model Version</th>
                    <th className="px-5 py-3.5 font-semibold">Global Accuracy</th>
                    <th className="px-5 py-3.5 font-semibold">Loss</th>
                    <th className="px-5 py-3.5 font-semibold">Edge Clients</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {history.map((r) => (
                    <tr key={r.round_id} className="hover:bg-white/[.02]">
                      <td className="px-5 py-3.5 font-mono font-bold text-cyan-300">Round #{r.round_number}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-200">{r.model_version}</td>
                      <td className="px-5 py-3.5 font-mono text-emerald-300">{(r.global_accuracy * 100).toFixed(2)}%</td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">{r.global_loss.toFixed(4)}</td>
                      <td className="px-5 py-3.5 text-slate-300">{r.total_participants || 3} Nodes</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-300">
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
