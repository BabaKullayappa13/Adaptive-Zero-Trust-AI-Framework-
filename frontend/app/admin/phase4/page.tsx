'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Flame, ShieldCheck, ShieldAlert, Play, RefreshCw,
  BookOpen, FileText, AlertTriangle, Zap, CheckCircle2,
  Clock, Shield, Terminal, Activity, Layers, Lock,
  ChevronRight, ArrowRight, ShieldX, Info
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminHeader from '@/components/admin/admin-header'
import { apiClient } from '@/lib/api'
import { formatTimestampIST } from '@/lib/date-utils'

const fetchReports = () => apiClient.getReports().then((res: any) => res.data)
const fetchDocs = () => apiClient.getOpenApiSpec().then((res: any) => res.data)

interface ScenarioDef {
  id: string
  title: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  expected: string
  mitreTag: string
}

const attackScenarios: ScenarioDef[] = [
  {
    id: 'NORMAL_LOGIN',
    title: 'Baseline Normal Login',
    description: 'Trusted workstation, typical keystroke and mouse cadence, verified primary credentials.',
    severity: 'LOW',
    expected: 'ALLOW',
    mitreTag: 'T1078 (Valid Accounts)'
  },
  {
    id: 'FAILED_CREDENTIALS',
    title: 'Credential Stuffing Anomaly',
    description: 'Sequential password rejections followed by sudden access attempt from automated client.',
    severity: 'MEDIUM',
    expected: 'CHALLENGE',
    mitreTag: 'T1110 (Brute Force)'
  },
  {
    id: 'NEW_DEVICE',
    title: 'Unrecognized Device Access',
    description: 'Unseen hardware canvas, user-agent divergence, zero historical enrollment authorization.',
    severity: 'MEDIUM',
    expected: 'CHALLENGE',
    mitreTag: 'T1078.004 (Cloud Accounts)'
  },
  {
    id: 'SUSPICIOUS_BEHAVIOR',
    title: 'Botnet & Kinematic Deviation',
    description: 'High-speed automated keystroke intervals, robotic mouse velocity, and proxy evasion.',
    severity: 'HIGH',
    expected: 'CHALLENGE / RESTRICT',
    mitreTag: 'T1059 (Command Execution)'
  },
  {
    id: 'IMPOSSIBLE_TRAVEL',
    title: 'Impossible Velocity Travel',
    description: 'Cross-continental session hop in minutes, proxy exit node, and untrusted public subnet.',
    severity: 'CRITICAL',
    expected: 'BLOCK',
    mitreTag: 'T1090 (Proxy Redirection)'
  },
  {
    id: 'INACTIVITY_LOCK',
    title: 'Zero-Trust Session Lock',
    description: 'Idle threshold exceeded. Immediate session freeze requiring standard password re-auth.',
    severity: 'MEDIUM',
    expected: 'LOCK',
    mitreTag: 'T1204 (User Execution)'
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

  const selectedScenario = attackScenarios.find((s) => s.id === selectedScenarioId) || attackScenarios[0]

  const handleRunSimulation = async (scenarioId: string) => {
    if (runningScenario) return // Prevent duplicate clicks
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
          trust_score: data.trust_score ?? data.evaluated_trust ?? 0,
          timestamp: new Date().toISOString(),
          details: data.reason || data.policy_result || 'Policy threshold enforcement'
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

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Section 1: Threat Simulation Header and Description */}
            <AdminHeader
              title="Threat Simulation"
              eyebrow="Security Operations Center · Adversarial Testing"
              description="Simulate adversarial attack vectors against the live Adaptive Zero Trust AI engine to evaluate real-time policy enforcements."
              icon={Flame}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('simulation')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'simulation'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="size-3.5 inline mr-1.5" /> Vectors
                </button>
                <button
                  type="button"
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
                  type="button"
                  onClick={() => setActiveTab('docs')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'docs'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="size-3.5 inline mr-1.5" /> API Specs
                </button>
              </div>
            </AdminHeader>

            {/* Architecture Transparency Banner */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Info className="size-4 shrink-0 text-amber-400" />
                <div>
                  <span className="font-semibold text-amber-300">Controlled Testing Environment: </span>
                  <span className="text-slate-300">
                    Simulated attack scenarios evaluate live policy logic and AI scoring. Decommissioned Secret PIN is strictly replaced by standard MFA step-up and restricted read-only session isolation.
                  </span>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                Non-Bypassable
              </span>
            </div>

            {/* KPI Summary Strip */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Configured Vectors</p>
                <p className="text-2xl font-bold font-mono text-cyan-300">{attackScenarios.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">MITRE ATT&amp;CK mapped</p>
              </div>
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Critical Severity</p>
                <p className="text-2xl font-bold font-mono text-rose-400">
                  {attackScenarios.filter((s) => s.severity === 'CRITICAL').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Immediate session revoke</p>
              </div>
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">High / Medium Severity</p>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {attackScenarios.filter((s) => s.severity === 'HIGH' || s.severity === 'MEDIUM').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Step-up / restricted access</p>
              </div>
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Policy Engine State</p>
                <p className="text-base font-bold text-emerald-400 mt-1">Enforcing v2.0</p>
                <p className="text-[10px] text-slate-500 mt-1">Active evaluation</p>
              </div>
            </section>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {activeTab === 'simulation' && (
              <div className="space-y-8">
                {/* Section 2: Available Attack Scenarios (Balanced 3-column Responsive Grid) */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Available Attack Vectors</h3>
                      <p className="text-xs text-slate-400">Select any adversarial scenario to configure parameters and execute real-time evaluation.</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">6 Vectors Loaded</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attackScenarios.map((sc) => {
                      const isSelected = selectedScenarioId === sc.id
                      const isRunning = runningScenario === sc.id

                      return (
                        <div
                          key={sc.id}
                          onClick={() => setSelectedScenarioId(sc.id)}
                          className={`cursor-pointer soc-panel p-5 border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                              : 'hover:border-white/20'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
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

                            <h4 className="text-sm font-semibold text-white mb-1 flex items-center justify-between">
                              {sc.title}
                              {isSelected && <span className="size-2 rounded-full bg-cyan-400 animate-ping" />}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed mb-3">{sc.description}</p>
                          </div>

                          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="font-mono text-[10px] text-slate-500">{sc.mitreTag}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleRunSimulation(sc.id)
                              }}
                              disabled={runningScenario !== null}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                                isSelected
                                  ? 'bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300'
                                  : 'bg-slate-900 border border-white/10 text-slate-200 hover:border-cyan-400/40'
                              }`}
                            >
                              <Play className={`size-3 ${isRunning ? 'animate-spin' : ''}`} />
                              {isRunning ? 'Emulating...' : 'Execute'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Section 3 & 4: Scenario Configuration, Execution Controls & Execution Progress */}
                <section className="soc-panel p-6 border-cyan-500/30 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Terminal className="size-4 text-cyan-400" />
                        Execution Console &amp; Vector Controls: {selectedScenario.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Configure simulation parameters and evaluate dynamic Zero Trust policy enforcement.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRunSimulation(selectedScenario.id)}
                      disabled={runningScenario !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition disabled:opacity-50 shadow-md shadow-cyan-950/40"
                    >
                      <Play className={`size-4 ${runningScenario ? 'animate-spin' : ''}`} />
                      {runningScenario ? 'Simulating Attack Vector...' : 'Execute Simulation'}
                    </button>
                  </div>

                  {/* Execution Progress & Pipeline Stages */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Pipeline Stage Trace</span>
                      <span className="font-mono text-cyan-300">
                        {runningScenario ? 'Analyzing Signals...' : simulationResult ? 'Evaluation Complete' : 'Idle / Ready'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { step: '1', title: 'Signal Ingestion', status: runningScenario || simulationResult ? 'complete' : 'pending' },
                        { step: '2', title: 'ML Anomaly Check', status: runningScenario ? 'active' : simulationResult ? 'complete' : 'pending' },
                        { step: '3', title: 'Trust-Risk Synthesis', status: simulationResult ? 'complete' : 'pending' },
                        { step: '4', title: 'Policy Enforcement', status: simulationResult ? 'complete' : 'pending' },
                      ].map((s) => (
                        <div
                          key={s.step}
                          className={`p-2.5 rounded-lg border text-center transition ${
                            s.status === 'complete'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : s.status === 'active'
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 animate-pulse'
                              : 'bg-slate-900 border-white/5 text-slate-500'
                          }`}
                        >
                          <span className="font-mono text-[10px] block opacity-70">STAGE {s.step}</span>
                          <span className="font-semibold text-[11px]">{s.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Section 5: Actual Zero Trust Policy Evaluation Results */}
                {simulationResult && (
                  <section className="soc-panel p-6 border-cyan-400/40 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <p className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                          Authoritative Evaluation Result
                        </p>
                        <h3 className="text-lg font-bold text-white mt-0.5">
                          Enforcement for: {simulationResult.scenario || selectedScenario.title}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                          simulationResult.decision === 'BLOCK' || simulationResult.decision === 'DENIED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : simulationResult.decision === 'STEP_UP_MFA' || simulationResult.decision === 'CHALLENGE' || simulationResult.decision === 'LOCK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {simulationResult.decision === 'BLOCK' || simulationResult.decision === 'DENIED' ? (
                          <ShieldX className="size-4" />
                        ) : simulationResult.decision === 'ALLOW' ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <ShieldAlert className="size-4" />
                        )}
                        Policy Enforced: {simulationResult.decision}
                      </span>
                    </div>

                    {/* Gauges & Evidence */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Calculated Risk Score</span>
                        <p className="text-2xl font-bold font-mono text-amber-300 mt-1">
                          {Number(simulationResult.risk_score ?? simulationResult.evaluated_risk ?? 0).toFixed(1)} <span className="text-xs text-slate-500 font-sans">/ 100</span>
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Composite Trust Score</span>
                        <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">
                          {Number(simulationResult.trust_score ?? simulationResult.evaluated_trust ?? 0).toFixed(1)} <span className="text-xs text-slate-500 font-sans">/ 100</span>
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Enforcement Trigger</span>
                        <p className="text-xs font-mono text-cyan-300 mt-2 truncate">
                          {simulationResult.reason || simulationResult.policy_result || 'Threshold Bound'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Security Outcome</span>
                        <p className="text-xs text-slate-300 mt-2">
                          {simulationResult.decision === 'BLOCK'
                            ? 'Session revoked; user redirected.'
                            : simulationResult.decision === 'ALLOW'
                            ? 'Full unrestricted access granted.'
                            : 'Access restricted to read-only; re-auth required.'}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Section 6: Event Timeline and Audit Evidence */}
                <section className="soc-panel overflow-hidden">
                  <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Activity className="size-4 text-cyan-400" />
                        Simulation Event Timeline &amp; Audit Trail
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Real-time log of simulation results persisted to audit storage</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{history.length} events in session</span>
                  </div>

                  {history.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[650px]">
                        <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-5 py-3">Timestamp (IST)</th>
                            <th className="px-5 py-3">Vector Scenario</th>
                            <th className="px-5 py-3">Enforced Decision</th>
                            <th className="px-5 py-3">Risk / Trust</th>
                            <th className="px-5 py-3">Audit Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {history.map((h, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition">
                              <td className="px-5 py-3 font-mono text-slate-400">
                                {formatTimestampIST(h.timestamp)}
                              </td>
                              <td className="px-5 py-3 font-semibold text-white">
                                {h.title}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    h.decision === 'BLOCK'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : h.decision === 'ALLOW'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {h.decision}
                                </span>
                              </td>
                              <td className="px-5 py-3 font-mono text-xs">
                                <span className="text-amber-300">{Number(h.risk_score).toFixed(0)}</span>
                                <span className="text-slate-500"> / </span>
                                <span className="text-cyan-300">{Number(h.trust_score).toFixed(0)}</span>
                              </td>
                              <td className="px-5 py-3 text-slate-400 truncate max-w-xs font-mono text-[11px]">
                                {h.details}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No threat simulation vectors have been executed yet in this session. Select a vector above to begin.
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <section className="soc-panel p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">Adversarial Evaluation Reports</h3>
                <p className="text-xs text-slate-400">
                  Comprehensive compliance and zero-trust verification records compiled across all simulated vectors.
                </p>
                <pre className="p-4 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto max-h-96">
                  {JSON.stringify(reports || { status: 'Compiling security statement...' }, null, 2)}
                </pre>
              </section>
            )}

            {/* Docs Tab */}
            {activeTab === 'docs' && (
              <section className="soc-panel p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">OpenAPI Adversarial Schema Reference</h3>
                <p className="text-xs text-slate-400">Live API definitions for testing and external SIEM orchestration.</p>
                <pre className="p-4 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto max-h-96">
                  {JSON.stringify(docs || { message: 'Loading schema...' }, null, 2)}
                </pre>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
