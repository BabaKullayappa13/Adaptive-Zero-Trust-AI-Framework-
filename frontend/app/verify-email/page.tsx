'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const token = searchParams.get('token') || ''
  
  const { verifyEmail, resendEmailVerification, isLoading } = useAuthStore()

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState(false)

  // Resend cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // Fallback: If a token parameter is provided via email link, handle transparently
  useEffect(() => {
    if (token) {
      const runTokenVerification = async () => {
        setLocalError('')
        setLocalSuccess('Verifying with Neon Auth...')
        setIsSubmitting(true)
        try {
          const res = await verifyEmail(email || initialEmail, undefined, token)
          if (res.success || res.email_verified) {
            setVerifiedSuccess(true)
            setLocalSuccess('Email verified successfully.\nRedirecting to login...')
            setTimeout(() => {
              router.replace('/auth/login?email=' + encodeURIComponent((email || initialEmail).trim()))
            }, 1500)
          }
        } catch (err: any) {
          setLocalError(err.message || 'Invalid or expired verification token.')
        } finally {
          setIsSubmitting(false)
        }
      }
      void runTokenVerification()
    }
  }, [token, email, initialEmail, verifyEmail, router])

  // Submit verification code entered by user
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setLocalError('Please enter your email address.')
      return
    }
    if (!code || code.trim().length === 0) {
      setLocalError('Please enter the verification code received by email.')
      return
    }

    setIsSubmitting(true)
    setLocalError('')
    setLocalSuccess('')

    try {
      const res = await verifyEmail(email.trim(), code.trim())
      if (res.success || res.email_verified) {
        setVerifiedSuccess(true)
        setLocalSuccess('Email verified successfully.\nRedirecting to login...')
        setTimeout(() => {
          router.replace('/auth/login?email=' + encodeURIComponent(email.trim()))
        }, 1500)
      } else {
        setLocalError(res.message || 'Invalid verification code.')
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('expired')) {
        setLocalError('This verification code has expired.\nPlease request a new verification code.')
      } else if (msg.toLowerCase().includes('invalid')) {
        setLocalError('Invalid verification code.')
      } else {
        setLocalError(msg || 'Invalid verification code.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Resend verification code via Neon Auth
  const handleResend = async () => {
    if (!email) {
      setLocalError('Please enter your registered email address.')
      return
    }
    if (cooldown > 0 || isResending) return

    setIsResending(true)
    setLocalError('')
    setLocalSuccess('')

    try {
      const res = await resendEmailVerification(email.trim())
      if (res.success || res.status === 'SUCCESS') {
        setLocalSuccess('Verification code sent. Check your email.')
        setCooldown(30)
      } else {
        setLocalError(res.message || 'Unable to send verification code. Please try again later.')
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('wait') || msg.includes('cooldown') || msg.includes('429')) {
        setLocalError(msg)
      } else {
        setLocalError('Unable to send verification code. Please try again later.')
      }
    } finally {
      setIsResending(false)
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
            <span className="text-cyan-300">Enter Verification Code</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            A verification code has been dispatched directly by Neon Auth to your email address. Enter the code below to confirm your identity and proceed to secure login.
          </p>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-4 text-xs text-cyan-200">
            <KeyRound className="size-5 shrink-0 text-cyan-400" />
            <span>Code verification confirms account ownership through cryptographic Neon Auth identity tokens.</span>
          </div>
        </div>

        <p className="text-xs text-slate-600">Enterprise Security Standard - Never Trust, Always Verify</p>
      </section>

      {/* Right Content */}
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
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                <Mail className="size-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100">Verify your email</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                We&apos;ve sent a verification code to your email address.
                <br />
                Enter the verification code below to verify your account.
              </p>
            </div>

            {/* Error Notification */}
            {localError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <ShieldAlert className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="whitespace-pre-line">{localError}</span>
              </div>
            )}

            {/* Success Notification */}
            {localSuccess && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="whitespace-pre-line font-medium">{localSuccess}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
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
                  disabled={verifiedSuccess || isSubmitting}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Verification code
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim().toUpperCase())}
                    placeholder="_ _ _ _ _ _"
                    maxLength={10}
                    autoFocus
                    required
                    disabled={verifiedSuccess || isSubmitting}
                    className="w-full rounded-xl border border-cyan-400/40 bg-slate-800/90 px-4 py-3 text-center text-lg font-mono tracking-[0.35em] text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isSubmitting || !email || !code || verifiedSuccess}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-400/20"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    Verify Email
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-slate-400">
              <span>Didn&apos;t receive the code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending || !email || verifiedSuccess}
                className="font-semibold text-cyan-300 hover:text-cyan-200 disabled:text-slate-500 disabled:cursor-not-allowed transition"
              >
                {cooldown > 0 ? `Resend Code in ${cooldown}s` : (isResending ? 'Sending...' : 'Resend Code')}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link href="/auth/login" className="text-xs text-slate-500 hover:text-slate-300">
                Back to Sign In
              </Link>
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
