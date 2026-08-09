'use client'

import { useEffect, useState } from 'react'

export default function AdminLiveMetrics() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch('/api/admin/metrics/summary?hours=24', { cache: 'no-store' })
        if (!response.ok) throw new Error('metrics unavailable')
        const value = await response.json()
        if (!cancelled) { setData(value); setError(false) }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    void load()
    const interval = window.setInterval(load, 30000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [])

  const values = data ? Object.entries(data).filter(([, value]) => typeof value === 'number').slice(0, 4) : []

  return (
    <section aria-labelledby="live-security-metrics" className="mb-8 soc-panel p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-cyan-200">Live security telemetry</p>
          <h2 id="live-security-metrics" className="mt-2 text-xl font-semibold text-white">Backend metrics, last 24 hours</h2>
        </div>
        <p className="text-xs text-slate-500">{error ? 'Metrics unavailable' : data ? 'Updated automatically' : 'Loading secure telemetry...'}</p>
      </div>
      {values.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{key.split('_').join(' ')}</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-100">{String(value)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-400">No numeric telemetry is available from the protected metrics service yet.</p>
      )}
    </section>
  )
}
