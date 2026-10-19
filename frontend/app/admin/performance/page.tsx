'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import {
  RefreshCw, CloudCog, ShieldCheck, ShieldAlert, ShieldX,
  Play, CheckCircle2, AlertTriangle, Layers, Server, Activity, Info
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminHeader from '@/components/admin/admin-header'
import { apiClient } from '@/lib/api'
import { formatTimestampIST } from '@/lib/date-utils'

const PRESET_RESOURCES = [
  { id: 'vault-kms-prod', name: 'Production KMS & Secret Vault', defaultCloud: 'private' },
  { id: 'k8s-cluster-internal', name: 'Internal Workload K8s Cluster', defaultCloud: 'private' },
  { id: 'analytics-data-lake', name: 'Enterprise Analytics Data Lake', defaultCloud: 'public' },
  { id: 'api-edge-proxy', name: 'Public Cloud Edge Reverse Proxy', defaultCloud: 'public' },
]

export default function AdminPerformancePage() {
  const [timeRange, setTimeRange] = useState('1d')
  const [telemetryData, setTelemetryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Test Evaluation Card State
  const [testCloud, setTestCloud] = useState<'private' | 'public'>('private')
  const [testResource, setTestResource] = useState('vault-kms-prod')
  const [testScenario, setTestScenario] = useState('normal')
  const [testAction, setTestAction] = useState('READ')
  const [testExecuting, setTestExecuting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const fetchTelemetry = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.getHybridCloudGatewayTelemetry(timeRange)
      setTelemetryData(res.data)
    } catch (error) {
      console.error('Failed to fetch gateway telemetry:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    void fetchTelemetry()
  }, [fetchTelemetry])

  const handleExecuteEvaluation = async () => {
    try {
      setTestExecuting(true)
      setTestError(null)
      const res = await apiClient.executeGatewayTestEvaluation({
        resource_id: testResource,
        destination_environment: testCloud,
        scenario: testScenario,
        action_type: testAction,
      })
      setTestResult(res.data)
      // Refresh telemetry so charts and recent tables update with the newly recorded event
      await fetchTelemetry()
    } catch (err: any) {
      setTestError(err?.response?.data?.detail || 'Failed to execute gateway test evaluation.')
    } finally {
      setTestExecuting(false)
    }
  }

  const timeseries = telemetryData?.timeseries || []
  const recentRequests = telemetryData?.recent_requests || []
  const hasData = Boolean(telemetryData?.has_data)

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <AdminHeader
              title="Cloud Gateways & System Performance"
              eyebrow="Hybrid Cloud Telemetry & Gateway"
              description="Real-time Zero-Trust policy gateway operations, access evaluations, and telemetry across private and public cloud workloads."
              icon={CloudCog}
            >
              <button
                onClick={() => void fetchTelemetry()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Telemetry
              </button>
            </AdminHeader>

            {/* Architecture Transparency Notice */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Info className="size-4 shrink-0 text-cyan-400" />
                <div>
                  <span className="font-semibold text-cyan-300">Architecture Environment: </span>
                  <span className="text-slate-300">
                    Local Zero Trust Policy Gateway Simulation. All access decisions and telemetry are computed via the live policy engine and persisted to database records.
                  </span>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-cyan-500/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
                Policy v2.0
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Telemetry Period
              </span>
              <div className="flex gap-2">
                {[
                  { id: '1h', label: '1 Hour' },
                  { id: '1d', label: '24 Hours' },
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: 'all', label: 'All Time' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTimeRange(t.id)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      timeRange === t.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Total Requests</p>
                <p className="text-2xl font-bold font-mono text-cyan-300">
                  {telemetryData?.requests_received ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Evaluated events</p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Allowed (Full Access)</p>
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  {telemetryData?.requests_allowed ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {telemetryData?.telemetry?.allow_rate ?? 0}% allow rate
                </p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Challenged (Restricted)</p>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {telemetryData?.requests_challenged ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">MFA required</p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Denied (Blocked)</p>
                <p className="text-2xl font-bold font-mono text-rose-400">
                  {telemetryData?.requests_denied ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Policy violation</p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Private Cloud</p>
                <p className="text-2xl font-bold font-mono text-violet-300">
                  {telemetryData?.private_cloud_requests ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Internal nodes</p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Avg Gateway Latency</p>
                <p className="text-2xl font-bold font-mono text-cyan-200">
                  {telemetryData?.gateway_processing_latency_avg_ms ?? 0} ms
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Pipeline overhead</p>
              </div>
            </section>

            {/* Administrative Test Execution Card */}
            <section className="soc-panel p-6 border-cyan-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Play className="size-4 text-cyan-400" />
                    Administrative Test Execution Card
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trigger an authentic Zero Trust access evaluation simulation against a private or public workload.
                  </p>
                </div>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[11px] font-mono text-cyan-300">
                  Interactive Evaluation Tool
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Destination Cloud
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTestCloud('private')}
                      className={`rounded-lg py-2 text-xs font-semibold border transition ${
                        testCloud === 'private'
                          ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Private Cloud
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestCloud('public')}
                      className={`rounded-lg py-2 text-xs font-semibold border transition ${
                        testCloud === 'public'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Public Cloud
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Resource
                  </label>
                  <select
                    value={testResource}
                    onChange={(e) => setTestResource(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    {PRESET_RESOURCES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Simulated Risk Scenario
                  </label>
                  <select
                    value={testScenario}
                    onChange={(e) => setTestScenario(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="normal">Normal Baseline (Expected: ALLOW)</option>
                    <option value="high_risk">Elevated Behavior (Expected: CHALLENGE)</option>
                    <option value="new_device">Unrecognized Device (Expected: CHALLENGE)</option>
                    <option value="critical_anomaly">Velocity / Anomaly (Expected: DENY)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Operation Action
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={testAction}
                      onChange={(e) => setTestAction(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="READ">READ (Telemetry / Log)</option>
                      <option value="WRITE">WRITE (Data Mutation)</option>
                      <option value="EXECUTE">EXECUTE (Process / Task)</option>
                      <option value="ADMIN_CONFIG">ADMIN_CONFIG (Privileged)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleExecuteEvaluation()}
                      disabled={testExecuting}
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition disabled:opacity-50"
                    >
                      <Play className={`size-3.5 ${testExecuting ? 'animate-spin' : ''}`} />
                      {testExecuting ? 'Testing...' : 'Execute'}
                    </button>
                  </div>
                </div>
              </div>

              {testError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 mb-4 flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  {testError}
                </div>
              )}

              {testResult && (
                <div className="rounded-xl border border-cyan-500/30 bg-white/[0.02] p-4 text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          testResult.gateway_decision === 'ALLOW'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : testResult.gateway_decision === 'CHALLENGE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        Policy Result: {testResult.gateway_decision}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        Latency: {testResult.latency_ms} ms
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      Event ID: {testResult.request_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Destination</span>
                      <span className="font-semibold text-white uppercase">{testResult.destination_environment}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Calculated Risk Score</span>
                      <span className="font-semibold font-mono text-amber-300">{testResult.risk_score} / 100</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Calculated Trust Score</span>
                      <span className="font-semibold font-mono text-cyan-300">{testResult.trust_score} / 100</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Recommended Action</span>
                      <span className="font-mono text-emerald-300">{testResult.explanation?.recommended_action || 'CONTINUE_MONITORING'}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Charts section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="soc-panel p-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Gateway Response Time Telemetry</span>
                  <span className="text-xs text-slate-500 font-normal">P99 & Avg (ms)</span>
                </h3>
                {timeseries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="timestamp" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="ms" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: 12 }} />
                      <Area type="monotone" dataKey="avg" fill="#06b6d4" stroke="#06b6d4" name="Avg Latency (ms)" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="max" fill="#f43f5e" stroke="#f43f5e" name="Max Latency (ms)" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                    <Activity className="size-8 text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No gateway telemetry recorded in this period</p>
                    <p className="mt-1 max-w-sm">
                      Execute a test vector using the Administrative Test Execution Card above to populate real-time latency points.
                    </p>
                  </div>
                )}
              </div>

              <div className="soc-panel p-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Gateway Request Volume Distribution</span>
                  <span className="text-xs text-slate-500 font-normal">Events per Time Slot</span>
                </h3>
                {timeseries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: 12 }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Evaluations" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                    <Layers className="size-8 text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No volume metrics recorded</p>
                    <p className="mt-1 max-w-sm">
                      Traffic volume distribution updates dynamically as access evaluations are performed.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Gateway Access Requests Table */}
            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Recent Gateway Access Requests</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Live audit log from gateway_requests table</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {recentRequests.length} records shown
                </span>
              </div>

              {recentRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3">Timestamp (IST)</th>
                        <th className="px-5 py-3">Environment</th>
                        <th className="px-5 py-3">Resource Target</th>
                        <th className="px-5 py-3">Decision</th>
                        <th className="px-5 py-3">Latency</th>
                        <th className="px-5 py-3">Source Tag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {recentRequests.map((req: any) => (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition">
                          <td className="px-5 py-3 font-mono text-slate-400">
                            {formatTimestampIST(req.created_at)}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                req.destination_environment === 'private'
                                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {req.destination_environment}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium text-white">
                            {req.resource_name || req.resource_id}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                req.gateway_decision === 'ALLOW'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : req.gateway_decision === 'CHALLENGE'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {req.gateway_decision}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-400">
                            {req.latency_ms} ms
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {req.is_simulation ? 'Policy Simulation' : 'Live Request'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  <Server className="size-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-400">No gateway requests recorded in this database table yet</p>
                  <p className="mt-1">
                    Execute a test above to record your first verified Zero-Trust access evaluation.
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  )
}
