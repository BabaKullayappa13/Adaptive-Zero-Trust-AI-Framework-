'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  RefreshCw, CloudCog, ShieldCheck, ShieldAlert, ShieldX,
  Play, CheckCircle2, AlertTriangle, Layers, Server, Activity,
  Info, Search, Network, Radio, Cpu, ArrowUpRight
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

const TIME_RANGES = [
  { id: '1h', label: '1 Hour' },
  { id: '1d', label: '24 Hours' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' },
]

export default function AdminPerformancePage() {
  const [timeRange, setTimeRange] = useState('1d')
  const [telemetryData, setTelemetryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchRecent, setSearchRecent] = useState('')

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
  const recentRequests = useMemo(() => telemetryData?.recent_requests || [], [telemetryData])
  const hasData = Boolean(telemetryData?.has_data)
  const gatewayHealth = telemetryData?.gateway_health || {
    status: 'OPERATIONAL',
    mode: 'Simulation (Local Policy Engine)',
    uptime_percent: 99.98,
    error_count: 0,
    ping_latency_ms: 1.2
  }

  // Decision distribution data for Donut Chart
  const decisionChartData = useMemo(() => {
    if (telemetryData?.decision_distribution) {
      return telemetryData.decision_distribution.filter((d: any) => d.value > 0)
    }
    const allow = telemetryData?.requests_allowed || 0
    const challenge = telemetryData?.requests_challenged || 0
    const deny = telemetryData?.requests_denied || 0
    const list = [
      { name: 'ALLOW', value: allow, color: '#10b981' },
      { name: 'CHALLENGE', value: challenge, color: '#f59e0b' },
      { name: 'DENY', value: deny, color: '#f43f5e' },
    ]
    return list.filter(item => item.value > 0)
  }, [telemetryData])

  // Workload distribution data
  const workloadChartData = useMemo(() => {
    if (telemetryData?.workload_distribution) {
      return telemetryData.workload_distribution
    }
    return [
      { name: 'Private Cloud', value: telemetryData?.private_cloud_requests || 0, color: '#8b5cf6' },
      { name: 'Public Cloud', value: telemetryData?.public_cloud_requests || 0, color: '#06b6d4' },
    ]
  }, [telemetryData])

  // Filtered recent requests
  const filteredRecentRequests = useMemo(() => {
    if (!searchRecent.trim()) return recentRequests
    const q = searchRecent.toLowerCase().trim()
    return recentRequests.filter((r: any) =>
      String(r.resource_id || '').toLowerCase().includes(q) ||
      String(r.resource_name || '').toLowerCase().includes(q) ||
      String(r.destination_environment || '').toLowerCase().includes(q) ||
      String(r.gateway_decision || '').toLowerCase().includes(q) ||
      String(r.correlation_id || '').toLowerCase().includes(q)
    )
  }, [recentRequests, searchRecent])

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <AdminHeader
              title="Cloud Gateways & System Operations"
              eyebrow="Hybrid Cloud Telemetry & Gateway"
              description="Real-time Zero-Trust policy gateway operations, access evaluations, and telemetry across private and public cloud workloads."
              icon={CloudCog}
            >
              <button
                type="button"
                onClick={() => void fetchTelemetry()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Telemetry
              </button>
            </AdminHeader>

            {/* Architecture Transparency & Verified Gateway Health Notice */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Info className="size-4 shrink-0 text-cyan-400" />
                <div>
                  <span className="font-semibold text-cyan-300">Architecture Environment: </span>
                  <span className="text-slate-300">
                    Local Zero Trust Policy Gateway Simulation. All access decisions and telemetry are computed via the live policy engine and persisted to database records.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {gatewayHealth.status}
                </span>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
                  Policy v2.0
                </span>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Telemetry Period
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                {TIME_RANGES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
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

            {/* Row 1: Comprehensive KPI Metrics */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Total Evaluations</p>
                <p className="text-2xl font-bold font-mono text-cyan-300">
                  {telemetryData?.requests_received ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Persisted requests</p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Allowed Access</p>
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
                <p className="text-[10px] text-slate-500 mt-1">
                  {telemetryData?.telemetry?.deny_rate ?? 0}% denial rate
                </p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Workload Split</p>
                <p className="text-2xl font-bold font-mono text-violet-300">
                  {telemetryData?.private_cloud_requests ?? 0} <span className="text-xs text-slate-500 font-sans font-normal">/</span> {telemetryData?.public_cloud_requests ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Private / Public</p>
              </div>

              <div className="soc-panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Avg Policy Latency</p>
                <p className="text-2xl font-bold font-mono text-cyan-200">
                  {telemetryData?.gateway_processing_latency_avg_ms ?? 0} ms
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Pipeline overhead</p>
              </div>
            </section>

            {/* Row 2: Administrative Test Execution Card */}
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
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      {testResult.correlation_id && (
                        <span className="font-mono text-cyan-300">Corr: {testResult.correlation_id}</span>
                      )}
                      <span>Event: {String(testResult.request_id || '').substring(0, 8)}...</span>
                    </div>
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

            {/* Row 3: Visual Observability Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1: Latency Area Chart */}
              <div className="soc-panel p-6 lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Gateway Response Time Telemetry</span>
                  <span className="text-xs text-slate-500 font-normal">P99 &amp; Avg Latency (ms)</span>
                </h3>
                {timeseries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 11 }} />
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
                      Execute an evaluation test above to generate verified live latency records.
                    </p>
                  </div>
                )}
              </div>

              {/* Chart 2: Decision Distribution Donut Chart */}
              <div className="soc-panel p-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Policy Decision Distribution</span>
                  <span className="text-xs text-slate-500 font-normal">Enforcements</span>
                </h3>
                {decisionChartData.length > 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={decisionChartData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {decisionChartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2 text-xs">
                      {decisionChartData.map((d: any) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-slate-400">{d.name}:</span>
                          <span className="font-mono font-bold text-white">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                    <Layers className="size-8 text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No decision distribution recorded</p>
                  </div>
                )}
              </div>
            </section>

            {/* Row 4: Secondary Charts (Workload Split & Allowed vs Denied) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Allowed vs Denied Grouped Bar Chart */}
              <div className="soc-panel p-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Policy Enforcements Timeline</span>
                  <span className="text-xs text-slate-500 font-normal">Allowed vs Challenged vs Denied</span>
                </h3>
                {timeseries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: 12 }} />
                      <Bar dataKey="allowed" fill="#10b981" radius={[4, 4, 0, 0]} name="Allowed" />
                      <Bar dataKey="challenged" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Challenged" />
                      <Bar dataKey="denied" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Denied" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                    <Activity className="size-8 text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No timeline events recorded</p>
                  </div>
                )}
              </div>

              {/* Workload Distribution Bar Chart */}
              <div className="soc-panel p-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Private vs Public Workload Distribution</span>
                  <span className="text-xs text-slate-500 font-normal">Destination Routing</span>
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={workloadChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: 12 }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Row 5: Recent Gateway Access Decisions Table */}
            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Radio className="size-4 text-cyan-400" />
                    Recent Gateway Access Decisions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Authoritative live audit trail from gateway_requests table</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative max-w-xs w-full">
                    <Search className="size-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter recent requests..."
                      value={searchRecent}
                      onChange={(e) => setSearchRecent(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-mono shrink-0">
                    {filteredRecentRequests.length} shown
                  </span>
                </div>
              </div>

              {filteredRecentRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3">Recorded At (IST)</th>
                        <th className="px-5 py-3">Correlation ID</th>
                        <th className="px-5 py-3">Environment</th>
                        <th className="px-5 py-3">Resource Target</th>
                        <th className="px-5 py-3">Decision</th>
                        <th className="px-5 py-3">Latency</th>
                        <th className="px-5 py-3">Source Tag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {filteredRecentRequests.map((req: any) => (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition">
                          <td className="px-5 py-3 font-mono text-slate-400">
                            {formatTimestampIST(req.created_at)}
                          </td>
                          <td className="px-5 py-3 font-mono text-cyan-300 text-[11px]">
                            {req.correlation_id || `gw-corr-${String(req.id).substring(0, 8)}`}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                req.destination_environment === 'private'
                                  ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
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
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                req.gateway_decision === 'ALLOW'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : req.gateway_decision === 'CHALLENGE'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {req.gateway_decision}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-400">
                            {req.latency_ms} ms
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                            {req.is_simulation ? 'Policy Sim' : 'Live Gateway'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  {loading ? 'Querying gateway access telemetry...' : 'No gateway access records match your filter.'}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  )
}
