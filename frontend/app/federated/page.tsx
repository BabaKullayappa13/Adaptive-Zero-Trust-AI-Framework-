'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2,
  Cpu, Database, HelpCircle, Network, Play, RefreshCw, Server,
  ShieldCheck, Sparkles, Terminal, Users, Zap
} from 'lucide-react'
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
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [histRes, modelsRes] = await Promise.all([
        apiClient.getFederatedHistory(15),
        apiClient.getFederatedModels(10),
      ])
      setHistory(histRes.data || [])
      setModels(modelsRes.data || [])
    } catch (err: any) {
      console.warn('Failed to fetch FL data:', err)
      setError('Unable to load federated learning records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleRunRound = async () => {
    setTraining(true)
    setError(null)
    try {
      const res = await apiClient.triggerFederatedRound()
      setLastRoundResult(res.data)
      await fetchData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Federated aggregation round failed.')
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
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300"
            >
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                Simulated Federated Learning
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                Privacy-Preserving FedAvg
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Federated AI Authentication Model Training
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Distributed collaborative learning across 4 simulated edge participants. Raw keystroke and behavioral telemetry remains strictly on local client partitions; only model weight parameters are aggregated via FedAvg to improve the global anomaly detection model.
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

        {error && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* 4 Simulated Client Nodes (Requirement 17) */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soc-panel border-cyan-400/30 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Client 1 (DC-West)</span>
              <Database className="size-4 text-cyan-300" />
            </div>
            <p className="text-xs text-slate-400">Private Cloud Identity Node</p>
            <div className="space-y-1 text-xs pt-2">
              <p className="text-slate-300">
                Local Partition: <strong className="font-mono text-cyan-200">1,450 records</strong>
              </p>
              <p className="text-slate-300">
                Data Transfer: <strong className="text-emerald-300">Weights Only (0 raw bytes)</strong>
              </p>
            </div>
          </div>

          <div className="soc-panel border-violet-400/30 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Client 2 (AWS-East)</span>
              <Server className="size-4 text-violet-300" />
            </div>
            <p className="text-xs text-slate-400">Public Cloud Workload Node</p>
            <div className="space-y-1 text-xs pt-2">
              <p className="text-slate-300">
                Local Partition: <strong className="font-mono text-violet-200">2,200 records</strong>
              </p>
              <p className="text-slate-300">
                Data Transfer: <strong className="text-emerald-300">Weights Only (0 raw bytes)</strong>
              </p>
            </div>
          </div>

          <div className="soc-panel border-emerald-400/30 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Client 3 (Edge Gateway)</span>
              <Cpu className="size-4 text-emerald-300" />
            </div>
            <p className="text-xs text-slate-400">Central Edge Gateway Node</p>
            <div className="space-y-1 text-xs pt-2">
              <p className="text-slate-300">
                Local Partition: <strong className="font-mono text-emerald-200">1,050 records</strong>
              </p>
              <p className="text-slate-300">
                Data Transfer: <strong className="text-emerald-300">Weights Only (0 raw bytes)</strong>
              </p>
            </div>
          </div>

          <div className="soc-panel border-amber-400/30 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Client 4 (Security Node)</span>
              <Network className="size-4 text-amber-300" />
            </div>
            <p className="text-xs text-slate-400">Hybrid Security Inspection Node</p>
            <div className="space-y-1 text-xs pt-2">
              <p className="text-slate-300">
                Local Partition: <strong className="font-mono text-amber-200">1,300 records</strong>
              </p>
              <p className="text-slate-300">
                Data Transfer: <strong className="text-emerald-300">Weights Only (0 raw bytes)</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Latest FedAvg Aggregation Result */}
        {lastRoundResult && (
          <section className="soc-panel border-emerald-400/40 bg-emerald-400/[.03] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-300" />
                <h3 className="text-base font-semibold text-white">
                  Round #{lastRoundResult.round_number} FedAvg Parameter Aggregation Complete
                </h3>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-300">
                {lastRoundResult.total_participants || 4} Clients Aggregated
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <span className="text-slate-400 uppercase text-[10px] font-semibold">Global Model:</span>
                <p className="mt-1 font-mono font-bold text-cyan-200">{lastRoundResult.model_version}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <span className="text-slate-400 uppercase text-[10px] font-semibold">Global Accuracy:</span>
                <p className="mt-1 font-mono font-bold text-emerald-300">
                  {(lastRoundResult.global_accuracy * 100).toFixed(2)}%
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <span className="text-slate-400 uppercase text-[10px] font-semibold">Global Loss:</span>
                <p className="mt-1 font-mono font-bold text-amber-300">
                  {lastRoundResult.global_loss.toFixed(4)}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <span className="text-slate-400 uppercase text-[10px] font-semibold">Privacy Status:</span>
                <p className="mt-1 font-bold text-emerald-300">0 Raw Telemetry Bytes Shared</p>
              </div>
            </div>

            {/* Local Client Performance Breakdown */}
            {lastRoundResult.client_metrics && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase text-slate-400">Local vs Global Client Performance:</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-xs">
                  {lastRoundResult.client_metrics.map((cm: any) => (
                    <div key={cm.client_id} className="rounded-lg border border-white/10 bg-slate-900/80 p-2.5">
                      <div className="flex items-center justify-between font-semibold text-slate-200">
                        <span>{cm.client_name || cm.client_id}</span>
                        <span className="font-mono text-cyan-300">{(cm.local_accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Loss: {cm.local_loss.toFixed(4)} &middot; {cm.samples} samples</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Federated Rounds History Table */}
        <section className="soc-panel overflow-hidden space-y-4 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <p className="eyebrow text-cyan-300">Training Telemetry</p>
              <h3 className="text-lg font-semibold text-white">Federated Training Rounds Progression</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              FedAvg Parameter Aggregation History
            </span>
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
                  <th className="px-5 py-3.5 font-semibold">Privacy Verification</th>
                  <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06]">
                {history.length > 0 ? (
                  history.map((r) => (
                    <tr key={r.round_id} className="hover:bg-white/[.02] transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-cyan-300">#{r.round_number}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-200">{r.model_version}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-300">
                        {(r.global_accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">{r.global_loss.toFixed(4)}</td>
                      <td className="px-5 py-3.5 text-slate-300">{r.total_participants || 4} Clients</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-emerald-300 font-semibold">
                          ZERO RAW DATA
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      No federated rounds recorded yet. Click &quot;Execute Federated Round&quot; above to simulate parameter aggregation.
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
