'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) })
      if (!response.ok) throw new Error('Invalid admin key')
      router.replace('/admin')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Admin authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return <main className="soc-shell flex min-h-screen items-center justify-center px-4 py-10"><section className="w-full max-w-md overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-950/85 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl"><div className="border-b border-white/10 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-400/10 p-8"><div className="mb-8 flex items-center justify-between"><div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200"><ShieldCheck className="size-6" /></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">Private console</span></div><p className="eyebrow text-cyan-200/70">Adaptive Zero Trust AI</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Admin access</h1><p className="mt-3 text-sm leading-6 text-slate-400">Authenticate to manage telemetry, policy controls, and platform operations.</p></div><form onSubmit={submit} className="flex flex-col gap-5 p-8"><label className="flex flex-col gap-2 text-sm font-medium text-slate-200" htmlFor="admin-key">Secure access key<span className="relative"><KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input id="admin-key" type="password" autoComplete="current-password" value={key} onChange={(event) => setKey(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3 pl-10 pr-4 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:bg-white/[.06]" placeholder="Enter your admin key" required /></span></label>{error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-200">{error}</p>}<button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"><LockKeyhole className="size-4" />{loading ? 'Verifying...' : 'Enter operations center'}</button><p className="text-center text-xs leading-5 text-slate-500">Access is logged and protected by an httpOnly session cookie.</p></form></section></main>
}
