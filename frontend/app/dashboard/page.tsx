'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Bell, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/navbar'
import SecurityOverview, { SecurityOverviewData } from '@/components/dashboard/security-overview'

export default function DashboardPage() {
  const router = useRouter()
  const { user, accessToken, isInitialized, logout, loadUser } = useAuthStore()
  const [summary, setSummary] = useState<SecurityOverviewData | null>(null)
  const [trustScore, setTrustScore] = useState<{ score: number; factors?: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void loadUser() }, [loadUser])
  useEffect(() => { if (isInitialized && (!user || !accessToken)) router.replace('/auth/login') }, [user, accessToken, isInitialized, router])

  const loadDashboard = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [summaryResponse, scoreResponse] = await Promise.all([apiClient.getDashboardSummary(), apiClient.getTrustScore(user.id)])
      setSummary(summaryResponse.data)
      setTrustScore(scoreResponse.data)
    } catch {
      setError('Security telemetry is unavailable. Check the backend service and retry.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { if (user) void loadDashboard() }, [user, loadDashboard])

  if (!isInitialized || !user || !accessToken) return <div className="min-h-screen bg-[#060b14]" />

  return <div className="soc-shell text-slate-100"><Navbar user={user} onLogout={logout} /><main className="mx-auto flex max-w-[1480px] flex-col gap-8 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10 lg:pb-10"><header className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.08] via-slate-950/50 to-violet-400/[.08] px-5 py-7 shadow-2xl shadow-slate-950/30 sm:px-8"><div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><ShieldCheck className="size-4" />Adaptive Zero Trust AI</div><h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Security operations center</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Continuous authentication, adaptive policy enforcement, and explainable risk intelligence.</p></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-300"><span className="size-2 animate-pulse rounded-full bg-emerald-300" />Operational</span><button type="button" onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-300/30 hover:bg-white/[.08]" disabled={loading}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div></div></header>{error && <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200" role="alert">{error} <button type="button" onClick={() => void loadDashboard()} className="ml-2 underline">Retry</button></div>}{loading && <div className="grid gap-6 lg:grid-cols-2" role="status" aria-label="Loading security telemetry">{[1, 2, 3, 4].map((item) => <div className="h-44 animate-pulse rounded-xl border border-white/10 bg-white/[.03]" key={item} />)}</div>}{summary && !loading && <SecurityOverview data={summary} trustScore={trustScore} />}<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-500"><span className="flex items-center gap-2"><Activity className="size-3.5 text-cyan-300" />Telemetry is sourced from the FastAPI security service.</span><span className="flex items-center gap-2"><Bell className="size-3.5" />No new critical alerts</span></footer></main></div>
}
