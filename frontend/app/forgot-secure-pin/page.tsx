'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

export default function ForgotSecurePinPage() {
  const router = useRouter()
  const { forgotSecurePin, isLoading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!email) {
      setLocalError('Please enter your account email address.')
      return
    }

    try {
      const res = await forgotSecurePin(email.trim())
      setLocalSuccess('Security recovery code dispatched to your email.')
      setTimeout(() => {
        router.push(`/reset-secure-pin?email=${encodeURIComponent(email.trim())}`)
      }, 1400)
    } catch (err: any) {
      setLocalError(err.message || 'Failed to request recovery code.')
    }
  }

  return (
    <main className="soc-shell grid min-h-screen lg:grid-cols-[1fr_1fr]">
      {/* Left Banner */}
      <section className="hidden flex-col justify-between border-r border-white/[.08] p-12 lg:flex">
        <Link href="/" className="flex items-center gap-3 text-sm font-bold tracking-wide text-slate-100">
          <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
            <ShieldCheck className="size-5" />
          </span>
          ADAPTIVE ZERO TRUST AI
        </Link>

        <div className="max-w-xl">
          <p className="eyebrow text-cyan-300">Self-Service Account Recovery</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight text-slate-50">
            Forgot Your<br />
            <span className="text-cyan-300">Secure PIN?</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            We provide verified recovery channels to reset your 6-digit Secure PIN without compromising Zero Trust session governance.
          </p>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-4 text-xs text-cyan-200">
            <Mail className="size-5 shrink-0 text-cyan-400" />
            <span>Enter your registered email address to receive an authorization code for resetting your Secure PIN.</span>
          </div>
        </div>

        <p className="text-xs text-slate-600">Enterprise Security Standard ? Never Trust, Always Verify</p>
      </section>

      {/* Right Form */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-100">
              <ShieldCheck className="size-5 text-cyan-300" />
              ADAPTIVE ZERO TRUST AI
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                <KeyRound className="size-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Reset Secure PIN</h2>
              <p className="mt-1 text-xs text-slate-400">
                Request a recovery authorization code to set a new PIN
              </p>
            </div>

            {localError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                <span>{localError}</span>
              </div>
            )}

            {localSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{localSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@zerotrust.ai"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Sending Recovery Code...
                  </>
                ) : (
                  <>
                    Send Recovery Code
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-white/5 pt-4 text-xs text-slate-400">
              <span>Remembered your PIN? </span>
              <Link href="/auth/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
