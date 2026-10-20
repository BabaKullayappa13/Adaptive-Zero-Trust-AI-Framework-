'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, ShieldCheck, Users, Radio, Laptop, ShieldAlert, Cpu, Network } from 'lucide-react'
import { apiClient } from '@/lib/api'

export default function AdminLiveMetrics() {
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadMetrics = useCallback(async () => {
    try {
      const res = await apiClient.getAdminSummary()
      if (res?.data) {
        setData(res.data)
        setError(false)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMetrics()
    const interval = window.setInterval(loadMetrics, 20000)
    return () => window.clearInterval(interval)
  }, [loadMetrics])

  const kpis = [
    {
      label: 'Total Audit Events',
      value: data?.total_requests_today ?? 0,
      icon: Activity,
      color: 'text-cyan-300',
      tag: 'Audit Logs'
    },
    {
      label: 'Active Sessions',
      value: data?.active_sessions ?? 0,
      icon: Radio,
      color: 'text-emerald-300',
      tag: 'Continuous Auth'
    },
    {
      label: 'Policy Enforcements',
      value: data?.zero_trust_policy_enforcements ?? 0,
      icon: ShieldCheck,
      color: 'text-violet-300',
      tag: 'Zero Trust Engine'
    },
    {
      label: 'Anomalies Mitigated',
      value: data?.anomalies_prevented ?? 0,
      icon: ShieldAlert,
      color: 'text-amber-300',
      tag: 'ML Anomaly Defense'
    },
    {
      label: 'Registered Users',
      value: data?.registered_users ?? 0,
      icon: Users,
      color: 'text-blue-300',
      tag: 'Identities'
    },
    {
      label: 'Enrolled Devices',
      value: data?.registered_devices ?? 0,
      icon: Laptop,
      color: 'text-teal-300',
      tag: 'Device Inventory'
    },
    {
      label: 'Gateway Requests',
      value: data?.gateway_requests ?? 0,
      icon: Cpu,
      color: 'text-indigo-300',
      tag: 'Hybrid Cloud'
    },
    {
      label: 'Federated Rounds',
      value: data?.federated_rounds ?? 0,
      icon: Network,
      color: 'text-rose-300',
      tag: 'Privacy FL'
    }
  ]

  return (
    <section aria-labelledby="live-security-metrics" className="mb-8 soc-panel p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4">
        <div>
          <p className="eyebrow text-cyan-200">Dynamic Security Telemetry</p>
          <h2 id="live-security-metrics" className="mt-1 text-xl font-semibold text-white">Live Enterprise Health &amp; Activity</h2>
        </div>
        <p className="text-xs font-mono text-slate-400">
          {error ? (
            <span className="text-amber-400">Metrics connection retrying...</span>
          ) : loading && !data ? (
            'Querying database state...'
          ) : (
            <span>Avg Response: <strong className="text-cyan-300">{data?.average_response_ms ?? 0} ms</strong> · Auto-refreshed</span>
          )}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">{kpi.label}</span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                  <Icon className={`size-3.5 ${kpi.color}`} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <p className="text-2xl font-bold font-mono text-white">{kpi.value}</p>
                <span className="text-[10px] text-slate-500 font-mono">{kpi.tag}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
