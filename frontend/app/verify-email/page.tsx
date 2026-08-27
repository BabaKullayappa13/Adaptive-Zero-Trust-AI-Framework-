'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, Mail, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  
  const { verifyEmail, resendEmailVerification, isLoading } = useAuthStore()

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!email || !code) {
      setLocalError('Please enter your email and the 6-digit verification code.')
      return
    }

    if (code.trim().length < 4) {
      setLocalError('Please enter a valid verification code.')
      return
    }

    try {
      const data = await verifyEmail(email.trim(), code.trim())
      setLocalSuccess('Email verified successfully! Preparing security onboarding...')

      setTimeout(() => {
        if (!data.secure_pin_configured) {
          router.replace('/setup-secure-pin?email=' + encodeURIComponent(email.trim()))
        } else {
          router.replace('/auth/login')
        }
      }, 1500)
    } catch (err: any) {
      setLocalError(err.message || 'Email verification failed. Please try again.')
    }
  }

  const handleResend = async () => {
    if (!email) {
      setLocalError('Please enter your email address to resend the code.')
      return
    }
    if (cooldown > 0) return

    setLocalError('')
    setLocalSuccess('')
    try {
      const res = await resendEmailVerification(email.trim())
      setLocalSuccess('A fresh verification code has been dispatched to your email.')
      if (res.verification_code) {
        setCode(res.verification_code)
      }
      setCooldown(30)
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend code.')
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
          <p className="eyebrow text-cyan-300">Identity Verification</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight text-slate-50">
            Verify Your Email<br />
            <span className="text-cyan-300">Activate Your Account</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            We require mandatory email verification to ensure communication channel integrity before activating multi-factor authentication and permanent Secure PIN protection.
          </p>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-4 text-xs text-cyan-200">
            <Mail className="size-5 shrink-0 text-cyan-400" />
            <span>Check your inbox for the 6-digit confirmation code. Verified accounts proceed to one-time Secure PIN setup.</span>
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
                <Mail className="size-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Email Verification</h2>
              <p className="mt-1 text-xs text-slate-400">
                Enter the verification code sent to your registered address
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

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Registered Email
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-center text-xl font-mono tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !code}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-slate-400">
              <span>Did not receive the code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="font-semibold text-cyan-300 hover:text-cyan-200 disabled:text-slate-500"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
