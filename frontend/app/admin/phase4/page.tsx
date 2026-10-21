'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Flame, ShieldCheck, ShieldAlert, Play, RefreshCw,
  BookOpen, FileText, AlertTriangle, Zap, CheckCircle2,
  Clock, Shield, Terminal, Activity, Layers, Lock,
  ChevronRight, ArrowRight, ShieldX, Info, Cpu, Check
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
  category: string
  signals: string[]
}

const attackScenarios: ScenarioDef[] = [
  {
    id: 'NORMAL_LOGIN',
    title: 'Baseline Normal Login',
    description: 'Trusted workstation, typical keystroke and mouse cadence, verified primary credentials.',
    severity: 'LOW',
    expected: 'ALLOW',
    mitreTag: 'T1078 (Valid Accounts)',
    category: 'Valid Accounts',
    signals: ['Device Trust: 90/100', 'Keystroke Speed: 4.1 kps', 'MFA: Verified', 'Network: Consistent']
  },
  {
    id: 'FAILED_CREDENTIALS',
    title: 'Credential Stuffing Anomaly',
    description: 'Sequential password rejections followed by sudden access attempt from automated client.',
    severity: 'MEDIUM',
    expected: 'CHALLENGE',
    mitreTag: 'T1110 (Brute Force)',
    category: 'Credential Access',
    signals: ['Failed Attempts: 3', 'Keystroke Speed: 2.1 kps', 'MFA: Pending Step-Up']
  },
  {
    id: 'NEW_DEVICE',
    title: 'Unrecognized Device Access',
    description: 'Unseen hardware canvas, user-agent divergence, zero historical enrollment authorization.',
    severity: 'MEDIUM',
    expected: 'CHALLENGE',
    mitreTag: 'T1078.004 (Cloud Accounts)',
    category: 'Initial Access / Device Anomaly',
    signals: ['New Device: True', 'Device Trust: 40/100', 'Browser Changed: True']
  },
  {
    id: 'SUSPICIOUS_BEHAVIOR',
    title: 'Botnet & Kinematic Deviation',
    description: 'High-speed automated keystroke intervals, robotic mouse velocity, and proxy evasion.',
    severity: 'HIGH',
    expected: 'CHALLENGE',
    mitreTag: 'T1059 (Command Execution)',
    category: 'Execution / Behavioral Anomaly',
    signals: ['Keystroke Speed: 12.5 kps', 'Mouse Velocity: 1400 px/s', 'AI Anomaly Score: 85/100', 'VPN: Active']
  },
  {
    id: 'IMPOSSIBLE_TRAVEL',
    title: 'Impossible Velocity Travel',
    description: 'Cross-continental session hop in minutes, proxy exit node, and untrusted public subnet.',
    severity: 'CRITICAL',
    expected: 'DENY',
    mitreTag: 'T1090 (Proxy Redirection)',
    category: 'Defense Evasion / Geolocation',
    signals: ['Impossible Travel: Detected', 'VPN / Proxy: Active', 'Device Trust: 30/100']
  },
  {
    id: 'INACTIVITY_LOCK',
    title: 'Zero-Trust Session Lock',
    description: 'Idle threshold exceeded. Immediate session freeze requiring standard password re-auth.',
    severity: 'MEDIUM',
    expected: 'LOCK',
    mitreTag: 'T1204 (User Execution)',
    category: 'Session Management',
    signals: ['Idle Duration: 650s (Threshold 600s)', 'Session Freeze: Required', 'Re-Auth: Enforced']
  }
]

type ExecutionState = 'idle' | 'running' | 'completed' | 'failed'

export default function AdminSimulationPage() {
  const [activeTab, setActiveTab] = useState<'simulation' | 'reports' | 'docs'>('simulation')
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('NORMAL_LOGIN')
  const [runningScenario, setRunningScenario] = useState<string | null>(null)
  const [execState, setExecState] = useState<ExecutionState>('idle')
  const [simulationResult, setSimulationResult] = useState<any | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: reports } = useSWR(activeTab === 'reports' ? 'phase4-reports' : null, fetchReports)
  const { data: docs } = useSWR(activeTab === 'docs' ? 'phase4-docs' : null, fetchDocs)

  const selectedScenario = attackScenarios.find((s) => s.id === selectedScenarioId) || attackScenarios[0]

  const handleRunSimulation = async (scenarioId: string) => {
    if (runningScenario) return // Prevent concurrent runs
    setSelectedScenarioId(scenarioId)
    setRunningScenario(scenarioId)
    setExecState('running')
    setErrorMsg(null)

    try {
      const res = await apiClient.runSimulationScenario(scenarioId)
      const data = res.data
      setSimulationResult(data)
      setExecState('completed')
      setHistory((prev) => [
        {
          id: data.scenario_id || scenarioId,
          title: attackScenarios.find((s) => s.id === scenarioId)?.title || scenarioId,
          decision: data.policy_decision || data.decision || 'ALLOW',
          enforcement_action: data.enforcement_action || 'CONTINUE_MONITORING',
          risk_score: data.risk_score ?? data.evaluated_risk ?? 0,
          trust_score: data.trust_score ?? data.evaluated_trust ?? 0,
          timestamp: data.execution_timestamp || data.timestamp || new Date().toISOString(),
          details: data.reason || data.policy_result || 'Policy threshold evaluation completed.',
          audit_id: data.audit_id || null
        },
        ...prev.slice(0, 19),
      ])
    } catch (err: any) {
      console.warn('Simulation execution error:', err)
      setExecState('failed')
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Simulation execution failed. Please verify that the backend engine is running and your administrator session is valid.'
      setErrorMsg(message)
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
            {/* Section 1: Threat Simulation Header and Navigation */}
            <AdminHeader
              eyebrow="ADAPTIVE SECURITY LAB · POLICY VALIDATION"
              title="Threat Simulation & Response"
              description="Execute controlled security scenarios against the Adaptive Zero Trust engine to validate AI-driven risk assessment, access policies, and security enforcement. Review execution results and audit evidence in real time."
              icon={Flame}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('simulation')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'simulation'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-950'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Flame className="size-3.5 inline mr-1.5" /> Vectors
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'reports'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-950'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="size-3.5 inline mr-1.5" /> Posture Reports
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('docs')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    activeTab === 'docs'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-950'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="size-3.5 inline mr-1.5" /> API Specs
                </button>
              </div>
            </AdminHeader>

            {/* KPI Summary Strip */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="soc-panel p-4 border border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Configured Vectors</p>
                <p className="text-2xl font-bold font-mono text-cyan-300">{attackScenarios.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">MITRE ATT&amp;CK mapped</p>
              </div>
              <div className="soc-panel p-4 border border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Critical Severity</p>
                <p className="text-2xl font-bold font-mono text-rose-400">
                  {attackScenarios.filter((s) => s.severity === 'CRITICAL').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Immediate session revoke</p>
              </div>
              <div className="soc-panel p-4 border border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">High / Medium Severity</p>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {attackScenarios.filter((s) => s.severity === 'HIGH' || s.severity === 'MEDIUM').length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">MFA challenge / isolation</p>
              </div>
              <div className="soc-panel p-4 border border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Policy Engine State</p>
                <p className="text-base font-bold text-emerald-400 mt-1">Enforcing v2.0</p>
                <p className="text-[10px] text-slate-500 mt-1">Live Zero Trust synthesis</p>
              </div>
            </section>

            {/* Actionable Error Alert if simulation fails */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                  <div>
                    <span className="font-semibold text-rose-200">Execution Error: </span>
                    <span>{errorMsg}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRunSimulation(selectedScenario.id)}
                  disabled={runningScenario !== null}
                  className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold border border-rose-500/40 text-[11px] transition shrink-0"
                >
                  Retry Vector
                </button>
              </div>
            )}

            {activeTab === 'simulation' && (
              <div className="space-y-8">
                {/* Section 2: Available Attack Scenarios Grid */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Available Attack Vectors</h3>
                      <p className="text-xs text-slate-400">Select any adversarial scenario to configure parameters and execute real-time evaluation.</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{attackScenarios.length} Vectors Configured</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attackScenarios.map((sc) => {
                      const isSelected = selectedScenarioId === sc.id
                      const isRunning = runningScenario === sc.id

                      return (
                        <div
                          key={sc.id}
                          onClick={() => {
                            setSelectedScenarioId(sc.id)
                            if (execState !== 'running') {
                              setErrorMsg(null)
                            }
                          }}
                          className={`cursor-pointer soc-panel p-5 border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                              : 'hover:border-white/20 bg-slate-900/60'
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
                                Expected: <strong className="text-slate-200">{sc.expected}</strong>
                              </span>
                            </div>

                            <h4 className="text-sm font-semibold text-white mb-1 flex items-center justify-between">
                              {sc.title}
                              {isSelected && <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed mb-3">{sc.description}</p>

                            {/* Simulated Signals Preview */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {sc.signals.slice(0, 3).map((sig, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 font-mono text-[9px] text-slate-400">
                                  {sig}
                                </span>
                              ))}
                            </div>
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

                {/* Section 3: Scenario Configuration & Execution Console */}
                <section className="soc-panel p-6 border-cyan-500/30 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Terminal className="size-4 text-cyan-400" />
                        <h3 className="text-sm font-semibold text-white">
                          Execution Console: {selectedScenario.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-cyan-300">
                          {selectedScenario.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Dispatches synthetic adversarial telemetry to the backend policy pipeline and returns verifiable evaluation evidence.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Live Execution State Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        execState === 'running'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 animate-pulse'
                          : execState === 'completed'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : execState === 'failed'
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                          : 'bg-slate-900 border-white/10 text-slate-400'
                      }`}>
                        <span className={`size-2 rounded-full ${
                          execState === 'running'
                            ? 'bg-cyan-400 animate-ping'
                            : execState === 'completed'
                            ? 'bg-emerald-400'
                            : execState === 'failed'
                            ? 'bg-rose-400'
                            : 'bg-slate-500'
                        }`} />
                        {execState === 'running'
                          ? 'Running'
                          : execState === 'completed'
                          ? 'Completed'
                          : execState === 'failed'
                          ? 'Failed'
                          : 'Ready'}
                      </span>

                      <button
                        type="button"
                        onClick={() => void handleRunSimulation(selectedScenario.id)}
                        disabled={runningScenario !== null}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition disabled:opacity-50 shadow-md shadow-cyan-950/40"
                      >
                        <Play className={`size-4 ${runningScenario ? 'animate-spin' : ''}`} />
                        {runningScenario ? 'Simulating Vector...' : 'Execute Simulation'}
                      </button>
                    </div>
                  </div>

                  {/* Execution Progress & Pipeline Stages */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Pipeline Stage Trace</span>
                      <span className="font-mono text-cyan-300">
                        {runningScenario ? 'Processing Signals...' : simulationResult ? 'Authoritative Result Recorded' : 'Awaiting Execution Trigger'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { step: '1', title: 'Signal Ingestion', status: runningScenario || simulationResult ? 'complete' : 'pending' },
                        { step: '2', title: 'AI Anomaly Check', status: runningScenario ? 'active' : simulationResult ? 'complete' : 'pending' },
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

                {/* Section 4: Authoritative Zero Trust Policy Evaluation Results */}
                {simulationResult && (
                  <section className="soc-panel p-6 border-cyan-400/40 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                            Authoritative Evaluation Verdict
                          </p>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                            MITRE: {simulationResult.mitre_tag || selectedScenario.mitreTag}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-0.5">
                          Enforcement for: {simulationResult.title || simulationResult.scenario || selectedScenario.title}
                        </h3>
                      </div>

                      {/* Authoritative Decision Badge */}
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                          simulationResult.policy_decision === 'DENY' || simulationResult.decision === 'DENY' || simulationResult.decision === 'BLOCK'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : simulationResult.policy_decision === 'CHALLENGE' || simulationResult.decision === 'CHALLENGE' || simulationResult.policy_decision === 'LOCK' || simulationResult.decision === 'LOCK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {simulationResult.policy_decision === 'DENY' || simulationResult.decision === 'DENY' || simulationResult.decision === 'BLOCK' ? (
                          <ShieldX className="size-4" />
                        ) : simulationResult.policy_decision === 'ALLOW' || simulationResult.decision === 'ALLOW' ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <ShieldAlert className="size-4" />
                        )}
                        Policy Enforced: {simulationResult.policy_decision || simulationResult.decision}
                      </span>
                    </div>

                    {/* Gauges & Evaluation Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Evaluated Risk Score</span>
                        <p className="text-2xl font-bold font-mono text-amber-300 mt-1">
                          {Number(simulationResult.risk_score ?? simulationResult.evaluated_risk ?? 0).toFixed(1)}{' '}
                          <span className="text-xs text-slate-500 font-sans">/ 100</span>
                        </p>
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                          Level: {simulationResult.risk_level || 'EVALUATED'}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Composite Trust Score</span>
                        <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">
                          {Number(simulationResult.trust_score ?? simulationResult.evaluated_trust ?? 0).toFixed(1)}{' '}
                          <span className="text-xs text-slate-500 font-sans">/ 100</span>
                        </p>
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                          Level: {simulationResult.trust_level || 'HEALTHY'}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Enforcement Action</span>
                        <p className="text-xs font-mono font-bold text-cyan-300 mt-2 truncate">
                          {simulationResult.enforcement_action || 'CONTINUE_MONITORING'}
                        </p>
                        <span className="inline-block mt-1 text-[10px] text-slate-400">
                          {simulationResult.policy_decision === 'DENY'
                            ? 'Session Revoked'
                            : simulationResult.policy_decision === 'CHALLENGE'
                            ? 'MFA Step-Up Demanded'
                            : simulationResult.policy_decision === 'LOCK'
                            ? 'Session Frozen'
                            : 'Unrestricted Access'}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-slate-400 text-[11px] block">Execution Timestamp</span>
                        <p className="text-xs font-mono text-slate-300 mt-2">
                          {formatTimestampIST(simulationResult.execution_timestamp || simulationResult.timestamp)}
                        </p>
                        {simulationResult.audit_id && (
                          <span className="inline-block mt-1 font-mono text-[9px] text-slate-500 truncate max-w-full">
                            Audit ID: {simulationResult.audit_id.slice(0, 13)}...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Policy Reason & Evidence Summary */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-white/10 text-xs">
                      <div className="flex items-center gap-2 mb-1.5 text-cyan-300 font-semibold">
                        <Cpu className="size-4" />
                        <span>Policy Synthesis &amp; Justification</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                        {simulationResult.reason || simulationResult.policy_result || 'Policy threshold evaluation completed successfully.'}
                      </p>
                    </div>

                    {/* Explainable AI (XAI) Attribution Breakdown if present */}
                    {simulationResult.explanation?.contributing_factors && simulationResult.explanation.contributing_factors.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <Activity className="size-3.5 text-cyan-400" />
                            XAI Feature Attribution Breakdown
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Dominant: <strong className="text-amber-300">{simulationResult.explanation.dominant_risk_factor}</strong>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {simulationResult.explanation.contributing_factors.map((cf: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-mono text-slate-300 truncate">{cf.feature}</span>
                                <span className={`font-mono font-bold ${cf.direction === 'INCREASES_RISK' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {cf.contribution_percent}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${cf.direction === 'INCREASES_RISK' ? 'bg-rose-400' : 'bg-emerald-400'}`}
                                  style={{ width: `${Math.min(100, Math.max(5, cf.contribution_percent))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Section 5: Event Timeline and Audit Trail */}
                <section className="soc-panel overflow-hidden border border-white/10">
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
                            <th className="px-5 py-3">Enforcement Action</th>
                            <th className="px-5 py-3">Audit Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {history.map((h, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition">
                              <td className="px-5 py-3 font-mono text-slate-400 whitespace-nowrap">
                                {formatTimestampIST(h.timestamp)}
                              </td>
                              <td className="px-5 py-3 font-semibold text-white whitespace-nowrap">
                                {h.title}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    h.decision === 'DENY' || h.decision === 'BLOCK'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : h.decision === 'ALLOW'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {h.decision}
                                </span>
                              </td>
                              <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">
                                <span className="text-amber-300">{Number(h.risk_score).toFixed(0)}</span>
                                <span className="text-slate-500"> / </span>
                                <span className="text-cyan-300">{Number(h.trust_score).toFixed(0)}</span>
                              </td>
                              <td className="px-5 py-3 font-mono text-[10px] text-cyan-300 whitespace-nowrap">
                                {h.enforcement_action}
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
              <section className="soc-panel p-6 space-y-4 border border-white/10">
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
              <section className="soc-panel p-6 space-y-4 border border-white/10">
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
