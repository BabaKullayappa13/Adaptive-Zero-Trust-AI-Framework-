'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Flame,
  ShieldCheck,
  ShieldAlert,
  Play,
  RefreshCw,
  Sparkles,
  BookOpen,
  FileText,
  AlertTriangle,
  Zap,
  Globe,
  Radio,
  Lock
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import { apiClient } from '@/lib/api'

const fetchReports = () => apiClient.getReports().then((res: any) => res.data)
const fetchDocs = () => apiClient.getOpenApiSpec().then((res: any) => res.data)

const attackScenarios = [
  {
    id: 'NORMAL_LOGIN',
    title: 'Baseline Normal Login',
    description: 'Trusted device, normal keystroke and mouse kinematics, verified MFA.',
    severity: 'LOW',
    expected: 'ALLOW'
  },
  {
    id: 'FAILED_CREDENTIALS',
    title: 'Credential Anomaly',
    description: 'Multiple failed password attempts followed by sudden successful entry.',
    severity: 'MEDIUM',
    expected: 'CHALLENGE (PIN)'
  },
  {
    id: 'NEW_DEVICE',
    title: 'Unrecognized Device Access',
    description: 'Fresh client fingerprint, browser mismatch, zero prior history.',
    severity: 'MEDIUM',
    expected: 'STEP_UP_MFA'
  },
  {
    id: 'SUSPICIOUS_BEHAVIOR',
    title: 'Kinematic & Botnet Anomaly',
    description: 'High-speed script navigation, abnormal keystroke variance, VPN source.',
    severity: 'HIGH',
    expected: 'STEP_UP_MFA / BLOCK'
  },
  {
    id: 'IMPOSSIBLE_TRAVEL',
    title: 'Impossible Velocity Travel',
    description: 'Cross-continental login in minutes, proxy evasion, untrusted subnet.',
    severity: 'CRITICAL',
    expected: 'BLOCK'
  },
  {
    id: 'INACTIVITY_LOCK',
    title: 'Zero-Trust Session Lock',
    description: 'Idle timeout exceeded. Immediate session freeze requiring PIN unlock.',
    severity: 'MEDIUM',
    expected: 'LOCK'
  }
]

export default function AdminSimulationPage() {
  const [activeTab, setActiveTab] = useState<'simulation' | 'reports' | 'docs'>('simulation')
  const [runningScenario, setRunningScenario] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: reports } = useSWR(activeTab === 'reports' ? 'phase4-reports' : null, fetchReports)
  const { data: docs } = useSWR(activeTab === 'docs' ? 'phase4-docs' : null, fetchDocs)

  const handleRunSimulation = async (scenarioId: string) => {
    setRunningScenario(scenarioId)
    setSimulationResult(null)
    setErrorMsg(null)
    try {
      const res = await apiClient.runSimulationScenario(scenarioId)
      setSimulationResult(res.data)
    } catch (err: any) {
      console.warn('Simulation error:', err)
      setErrorMsg(err?.response?.data?.detail || 'Simulation execution failed.')
    } finally {
      setRunningScenario(null)
    }
  }

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow text-amber-400">Red-Teaming & Threat Emulation</p>
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                  <Flame className="size-8 text-amber-400" />
                  Attack Simulation & Advanced Analytics
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Simulate adversarial tactics against the live Adaptive Zero Trust AI engine and evaluate real-time policy enforcements.
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('simulation')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'simulation'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="size-3.5 inline mr-1.5" /> Simulation Lab
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'reports'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="size-3.5 inline mr-1.5" /> Analytics Reports
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'docs'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="size-3.5 inline mr-1.5" /> OpenAPI Docs
                </button>
              </div>
            </header>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4" />
                {errorMsg}
              </div>
            )}

            {activeTab === 'simulation' && (
              <div className="space-y-6">
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {attackScenarios.map((sc) => (
                    <div
                      key={sc.id}
                      className="soc-panel p-5 flex flex-col justify-between border hover:border-amber-400/40 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              sc.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300'
                                : sc.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300'
                                : sc.severity === 'MEDIUM'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {sc.severity}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Target: {sc.expected}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1.5">{sc.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>
                      </div>

                      <button
                        onClick={() => void handleRunSimulation(sc.id)}
                        disabled={runningScenario !== null}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-300 transition disabled:opacity-50"
                      >
                        <Play className={`size-3.5 ${runningScenario === sc.id ? 'animate-spin' : ''}`} />
                        {runningScenario === sc.id ? 'Simulating...' : 'Execute Vector'}
                      </button>
                    </div>
                  ))}
                </section>

                {/* Simulation Output Card */}
                {simulationResult && (
                  <section className="soc-panel p-6 border-cyan-400/30">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                      <div>
                        <p className="text-xs text-cyan-400 font-mono">Telemetry Trace Output</p>
                        <h2 className="text-lg font-semibold text-white">
                          Scenario Result: {simulationResult.scenario}
                        </h2>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          simulationResult.decision === 'BLOCK'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : simulationResult.decision === 'STEP_UP_MFA' || simulationResult.decision === 'LOCK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        Decision: {simulationResult.decision}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3 text-xs mb-4">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-500">Calculated Risk Score</span>
                        <p className="text-lg font-bold font-mono text-amber-300 mt-1">
                          {simulationResult.risk_score?.toFixed(1) || simulationResult.evaluated_risk || 'N/A'} / 100
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-500">Composite Trust Score</span>
                        <p className="text-lg font-bold font-mono text-emerald-300 mt-1">
                          {simulationResult.trust_score?.toFixed(1) || simulationResult.evaluated_trust || 'N/A'} / 100
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-500">Reason / Policy Factor</span>
                        <p className="text-slate-200 mt-1 truncate">
                          {simulationResult.reason || simulationResult.policy_result || 'Evaluation Complete'}
                        </p>
                      </div>
                    </div>

                    <pre className="p-4 rounded-xl bg-slate-900 border border-white/10 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
                      {JSON.stringify(simulationResult, null, 2)}
                    </pre>
                  </section>
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <section className="soc-panel p-6 space-y-4">
                <h2 className="text-base font-semibold text-white">Aggregated Platform Reports</h2>
                <p className="text-xs text-slate-400">
                  Automated security posture assessments generated from real session logs.
                </p>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs">
                  {reports ? (
                    <pre className="font-mono text-slate-300 max-h-96 overflow-y-auto">
                      {JSON.stringify(reports, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-slate-500">Loading platform reports...</p>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'docs' && (
              <section className="soc-panel p-6 space-y-4">
                <h2 className="text-base font-semibold text-white">FastAPI OpenAPI Specification</h2>
                <p className="text-xs text-slate-400">
                  Authoritative schema documentation for zero-trust endpoints and MFA routes.
                </p>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs">
                  {docs ? (
                    <pre className="font-mono text-slate-300 max-h-96 overflow-y-auto">
                      {JSON.stringify(docs, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-slate-500">Loading API specification...</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
