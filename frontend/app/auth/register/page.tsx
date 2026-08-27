'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Lock, Mail, RefreshCw, ShieldAlert, ShieldCheck, User } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }

    try {
      const data = await register(email.trim(), password, name.trim() || 'Security Operator')
      setLocalSuccess('Account created successfully! Redirecting to email verification...')
      setTimeout(() => {
        router.push('/verify-email?email=' + encodeURIComponent(email.trim()))
      }, 1400)
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed. Please try again.')
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
          <p className="eyebrow text-cyan-300">Next-Generation Zero Trust Identity</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight text-slate-50">
            Continuous MFA &<br />
            <span className="text-cyan-300">Adaptive Risk Engine</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            Register your operator account with password security and software-only multi-factor protection. After registration, complete email verification and one-time Secure PIN setup.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300">
              <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-400/10 font-mono text-cyan-300 font-bold">1</span>
              <span>Account Registration & Verification Email</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300">
              <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-400/10 font-mono text-cyan-300 font-bold">2</span>
              <span>One-Time Permanent 6-Digit Secure PIN Setup</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300">
              <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-400/10 font-mono text-cyan-300 font-bold">3</span>
              <span>Zero Trust Continuous Behavioral Monitoring</span>
            </div>
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
                <ShieldCheck className="size-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Create Operator Account</h2>
              <p className="mt-1 text-xs text-slate-400">
                Begin onboarding into the Zero Trust MFA Architecture
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Full Name / Operator Alias
                </label>
                <div className="relative mt-1">
                  <User className="absolute left-3.5 top-3 size-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Security Operator"
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Corporate / Operator Email
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-3 size-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@zerotrust.ai"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Account Password (min 8 chars)
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-3 size-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="????????????"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-3 size-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="????????????"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Registering Account...
                  </>
                ) : (
                  <>
                    Continue to Email Verification
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-white/5 pt-4 text-xs text-slate-400">
              <span>Already have an account? </span>
              <Link href="/auth/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
