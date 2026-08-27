'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, ArrowRight, BrainCircuit, CheckCircle2, Cpu, Database, Network, Play, RefreshCw, Server, ShieldCheck, Sparkles, Users } from 'lucide-react'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'

export default function FederatedLearningPage() {
  const { user, logout } = useAuthStore()
  const [history, setHistory] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [training, setTraining] = useState(false)
  const [lastRoundResult, setLastRoundResult] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [histRes, modelsRes] = await Promise.all([
        apiClient.getFederatedHistory(10),
        apiClient.getFederatedModels(10),
      ])
      setHistory(histRes.data)
      setModels(modelsRes.data)
    } catch (err) {
      console.warn('Failed to fetch FL data:', err)
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
      const res = await apiClient.triggerFederatedRound()
      setLastRoundResult(res.data)
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setTraining(false)
    }
  }

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-emerald-300">Privacy-Preserving Distributed Machine Learning</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Federated Learning Simulation for Privacy-Preserving Authentication Model Improvement
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Decentralized training across 3 edge clients. Raw keystroke and mouse telemetry remains local on client nodes. Only model parameter updates are aggregated via FedAvg to improve the global anomaly detection model.
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
              {training ? 'Simulating FedAvg Round...' : 'Execute Federated Round'}
            </button>
          </div>
        </header>

        {/* 3 Participating Client Nodes Overview */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="soc-panel border-cyan-400/30 p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Client A (DC-West)</span>
              <Database className="size-4 text-cyan-300" />
            </div>
            <p className="mt-2 text-xs text-slate-400">Private Cloud Identity Node</p>
            <div className="mt-4 space-y-1 text-xs">
              <p className="text-slate-300">Samples: <strong className="font-mono text-cyan-200">1,450 records</strong></p>
              <p className="text-slate-300">Data Transfer: <strong className="text-emerald-300">Parameters Only (0 raw bytes)</strong></p>
            </div>
          </div>

          <div className="soc-panel border-violet-400/30 p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Client B (AWS-East)</span>
              <Server className="size-4 text-violet-300" />
            </div>
            <p className="mt-2 text-xs text-slate-400">Public Cloud Workload Node</p>
            <div className="mt-4 space-y-1 text-xs">
              <p className="text-slate-300">Samples: <strong className="font-mono text-violet-200">2,200 records</strong></p>
              <p className="text-slate-300">Data Transfer: <strong className="text-emerald-300">Parameters Only (0 raw bytes)</strong></p>
            </div>
          </div>

          <div className="soc-panel border-emerald-400/30 p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Client C (Edge Gateway)</span>
              <Cpu className="size-4 text-emerald-300" />
            </div>
            <p className="mt-2 text-xs text-slate-400">Central Edge Gateway Node</p>
            <div className="mt-4 space-y-1 text-xs">
              <p className="text-slate-300">Samples: <strong className="font-mono text-emerald-200">1,050 records</strong></p>
              <p className="text-slate-300">Data Transfer: <strong className="text-emerald-300">Parameters Only (0 raw bytes)</strong></p>
            </div>
          </div>
        </section>

        {/* Latest Aggregation Summary */}
        {lastRoundResult && (
          <section className="soc-panel border-emerald-400/40 bg-emerald-400/[.03] p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-300" />
              <h3 className="text-base font-semibold text-white">
                Round {lastRoundResult.round_number} FedAvg Aggregation Complete
              </h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
              <div>
                <span className="text-slate-400">Global Model Version:</span>
                <p className="mt-1 font-mono font-bold text-cyan-200">{lastRoundResult.model_version}</p>
              </div>
              <div>
                <span className="text-slate-400">Global Accuracy:</span>
                <p className="mt-1 font-mono font-bold text-emerald-300">{(lastRoundResult.global_accuracy * 100).toFixed(2)}%</p>
              </div>
              <div>
                <span className="text-slate-400">Total Samples Trained:</span>
                <p className="mt-1 font-mono font-bold text-slate-100">{lastRoundResult.total_samples_processed}</p>
              </div>
              <div>
                <span className="text-slate-400">Privacy Status:</span>
                <p className="mt-1 font-bold text-emerald-300">100% Privacy-Preserved</p>
              </div>
            </div>
          </section>
        )}

        {/* Federated Rounds History Table */}
        <section className="soc-panel overflow-hidden">
          <div className="border-b border-white/10 p-5">
            <h3 className="text-base font-semibold text-white">Federated Training Rounds History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Round</th>
                  <th className="px-5 py-3.5 font-semibold">Model Version</th>
                  <th className="px-5 py-3.5 font-semibold">Global Accuracy</th>
                  <th className="px-5 py-3.5 font-semibold">Loss</th>
                  <th className="px-5 py-3.5 font-semibold">Participants</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Aggregated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06]">
                {history.length > 0 ? (
                  history.map((r) => (
                    <tr key={r.round_id} className="hover:bg-white/[.02]">
                      <td className="px-5 py-3.5 font-mono font-bold text-cyan-300">#{r.round_number}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-200">{r.model_version}</td>
                      <td className="px-5 py-3.5 font-mono text-emerald-300">{(r.global_accuracy * 100).toFixed(2)}%</td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">{r.global_loss.toFixed(4)}</td>
                      <td className="px-5 py-3.5 text-slate-300">{r.total_participants || 3} Edge Nodes</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-300 font-semibold">
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      No federated rounds executed yet. Click &apos;Execute Federated Round&apos; to start.
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
