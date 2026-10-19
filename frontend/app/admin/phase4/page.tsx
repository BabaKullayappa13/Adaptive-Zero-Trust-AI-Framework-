'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Flame, ShieldCheck, ShieldAlert, Play, RefreshCw,
  BookOpen, FileText, AlertTriangle, Zap, CheckCircle2,
  Clock, Shield, Terminal, Activity, Layers, Lock
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminHeader from '@/components/admin/admin-header'
import { apiClient } from '@/lib/api'
import { formatTimestampIST } from '@/lib/date-utils'

const fetchReports = () => apiClient.getReports().then((res: any) => res.data)
const fetchDocs = () => apiClient.getOpenApiSpec().then((res: any) => res.data)

const attackScenarios = [
  {
    id: 'NORMAL_LOGIN',
    title: 'Baseline Normal Login',
    description: 'Trusted workstation, typical keystroke and mouse cadence, verified primary MFA.',
    severity: 'LOW',
    expected: 'ALLOW'
  },
  {
    id: 'FAILED_CREDENTIALS',
    title: 'Credential Stuffing Anomaly',
    description: 'Multiple sequential password rejections followed by sudden access.',
    severity: 'MEDIUM',
    expected: 'CHALLENGE'
  },
  {
    id: 'NEW_DEVICE',
    title: 'Unrecognized Device Access',
    description: 'Unseen hardware canvas, user-agent divergence, zero historical authorization.',
    severity: 'MEDIUM',
    expected: 'CHALLENGE'
  },
  {
    id: 'SUSPICIOUS_BEHAVIOR',
    title: 'Botnet & Kinematic Deviation',
    description: 'High-speed automated keystroke intervals, abnormal mouse speed, proxy detected.',
    severity: 'HIGH',
    expected: 'CHALLENGE / RESTRICT'
  },
  {
    id: 'IMPOSSIBLE_TRAVEL',
    title: 'Impossible Velocity Travel',
    description: 'Cross-continental session hop in minutes, proxy evasion, untrusted IP subnet.',
    severity: 'CRITICAL',
    expected: 'BLOCK'
  },
  {
    id: 'INACTIVITY_LOCK',
    title: 'Zero-Trust Session Lock',
    description: 'Idle threshold exceeded. Immediate session freeze requiring password re-auth.',
    severity: 'MEDIUM',
    expected: 'LOCK'
  }
]

export default function AdminSimulationPage() {
  const [activeTab, setActiveTab] = useState<'simulation' | 'reports' | 'docs'>('simulation')
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('NORMAL_LOGIN')
  const [runningScenario, setRunningScenario] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<any | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: reports } = useSWR(activeTab === 'reports' ? 'phase4-reports' : null, fetchReports)
  const { data: docs } = useSWR(activeTab === 'docs' ? 'phase4-docs' : null, fetchDocs)

  const handleRunSimulation = async (scenarioId: string) => {
    setSelectedScenarioId(scenarioId)
    setRunningScenario(scenarioId)
    setErrorMsg(null)
    try {
      const res = await apiClient.runSimulationScenario(scenarioId)
      const data = res.data
      setSimulationResult(data)
      setHistory((prev) => [
        {
          id: data.scenario_id || scenarioId,
          title: attackScenarios.find((s) => s.id === scenarioId)?.title || scenarioId,
          decision: data.decision || 'ALLOW',
          risk_score: data.risk_score ?? data.evaluated_risk ?? 0,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ])
    } catch (err: any) {
      console.warn('Simulation error:', err)
      setErrorMsg(err?.response?.data?.detail || 'Simulation execution failed.')
    } finally {
      setRunningScenario(null)
    }
  }

  const selectedScenario = attackScenarios.find((s) => s.id === selectedScenarioId) || attackScenarios[0]

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <AdminHeader
              title="Threat Emulation & Red-Teaming Lab"
              eyebrow="Zero-Trust Adversarial Assessment"
              description="Simulate adversarial attack vectors against the live Adaptive Zero Trust AI engine to evaluate real-time policy enforcements."
              icon={Flame}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('simulation')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'simulation'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="size-3.5 inline mr-1.5" /> Threat Vectors
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'reports'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="size-3.5 inline mr-1.5" /> Posture Reports
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'docs'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="size-3.5 inline mr-1.5" /> OpenAPI Docs
                </button>
              </div>
            </AdminHeader>

            {/* KPI Summary Cards */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Configured Vectors</p>
                <p className="text-2xl font-bold font-mono text-cyan-300">{attackScenarios.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">MITRE ATT&CK mapped</p>
              </div>
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Critical Severity</p>
                <p className="text-2xl font-bold font-mono text-rose-400">
                  {attackScenarios.filter((s) => s.severity === 'CRITICAL').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Immediate session revoke</p>
              </div>
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">High Severity</p>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {attackScenarios.filter((s) => s.severity === 'HIGH').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Step-up / restricted access</p>
              </div>
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Policy Engine State</p>
                <p className="text-base font-bold text-emerald-400 mt-1">Enforcing v2.0</p>
                <p className="text-[10px] text-slate-500 mt-1">Real-time evaluation active</p>
              </div>
            </section>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {activeTab === 'simulation' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Scenario Selection List */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Adversarial Scenarios
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Select &amp; Execute
                    </span>
                  </div>

                  {attackScenarios.map((sc) => {
                    const isSelected = selectedScenarioId === sc.id
                    const isRunning = runningScenario === sc.id
                    return (
                      <div
                        key={sc.id}
                        onClick={() => setSelectedScenarioId(sc.id)}
                        className={`cursor-pointer soc-panel p-4 border transition-all ${
                          isSelected
                            ? 'border-cyan-400/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/40'
                            : 'hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sc.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : sc.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : sc.severity === 'MEDIUM'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {sc.severity}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Expected: {sc.expected}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-white mb-1">{sc.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">{sc.description}</p>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleRunSimulation(sc.id)
                          }}
                          disabled={runningScenario !== null}
                          className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition disabled:opacity-50 ${
                            isSelected
                              ? 'bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300'
                              : 'bg-slate-900 border border-white/10 text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200'
                          }`}
                        >
                          <Play className={`size-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                          {isRunning ? 'Simulating Vector...' : 'Execute Vector'}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Right Column: Live Execution Output & Policy Rule Evidence */}
                <div className="lg:col-span-7 space-y-6">
                  {simulationResult ? (
                    <section className="soc-panel p-6 border-cyan-400/40 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div>
                          <p className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                            Live Telemetry Trace Output
                          </p>
                          <h3 className="text-lg font-bold text-white mt-0.5">
                            Scenario: {simulationResult.scenario || selectedScenario.title}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            simulationResult.decision === 'BLOCK'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : simulationResult.decision === 'STEP_UP_MFA' || simulationResult.decision === 'CHALLENGE' || simulationResult.decision === 'LOCK'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          Enforced: {simulationResult.decision}
                        </span>
                      </div>

                      {/* Visual Metric Gauges */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-slate-400 text-[11px] block">Calculated Risk</span>
                          <p className="text-xl font-bold font-mono text-amber-300 mt-1">
                            {Number(simulationResult.risk_score ?? simulationResult.evaluated_risk ?? 0).toFixed(1)} / 100
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-slate-400 text-[11px] block">Composite Trust</span>
                          <p className="text-xl font-bold font-mono text-emerald-300 mt-1">
                            {Number(simulationResult.trust_score ?? simulationResult.evaluated_trust ?? 0).toFixed(1)} / 100
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 col-span-2 sm:col-span-1">
                          <span className="text-slate-400 text-[11px] block">Policy Rule Match</span>
                          <p className="text-xs font-mono text-cyan-300 mt-1 truncate">
                            {simulationResult.reason || simulationResult.policy_result || 'Default Threshold Enforcement'}
                          </p>
                        </div>
                      </div>

                      {/* Policy Rule Evidence */}
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2 text-xs">
                        <h4 className="font-semibold text-white flex items-center gap-1.5">
                          <ShieldCheck className="size-4 text-cyan-400" />
                          Zero Trust Policy Rule Evidence
                        </h4>
                        <div className="space-y-1.5 text-slate-300 pt-1">
                          <p className="flex justify-between">
                            <span className="text-slate-400">Target Expectation:</span>
                            <span className="font-mono text-white">{selectedScenario.expected}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Enforced Decision:</span>
                            <span className="font-mono font-semibold text-cyan-300">{simulationResult.decision}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Target Severity:</span>
                            <span className="font-mono text-amber-300">{selectedScenario.severity}</span>
                          </p>
                        </div>
                      </div>

                      {/* Expandable JSON Terminal */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Terminal className="size-3.5 text-slate-500" />
                            Raw Telemetry &amp; XAI Payload
                          </span>
                        </div>
                        <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56">
                          {JSON.stringify(simulationResult, null, 2)}
                        </pre>
                      </div>
                    </section>
                  ) : (
                    <section className="soc-panel p-8 text-center text-xs text-slate-500 border border-dashed border-white/10">
                      <Flame className="size-10 mx-auto text-amber-400/50 mb-3" />
                      <h4 className="text-sm font-semibold text-white">No active simulation execution</h4>
                      <p className="mt-1 max-w-md mx-auto text-slate-400">
                        Select any threat vector from the list on the left and click &quot;Execute Vector&quot; to test the Zero Trust AI framework&apos;s real-time detection and enforcement.
                      </p>
                    </section>
                  )}

                  {/* Execution History Timeline */}
                  {history.length > 0 && (
                    <section className="soc-panel p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Clock className="size-3.5 text-cyan-400" />
                          Recent Emulation Runs
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {history.length} executed
                        </span>
                      </div>

                      <div className="space-y-2">
                        {history.map((h, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-white">{h.title}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {formatTimestampIST(h.timestamp)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-amber-300 text-[11px]">
                                Risk: {Number(h.risk_score).toFixed(1)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  h.decision === 'BLOCK'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : h.decision === 'STEP_UP_MFA' || h.decision === 'CHALLENGE' || h.decision === 'LOCK'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {h.decision}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
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
