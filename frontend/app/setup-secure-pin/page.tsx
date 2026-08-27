'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Lock, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

function SetupSecurePinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''

  const { setupSecurePin, isLoading } = useAuthStore()

  const [email, setEmail] = useState(initialEmail)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')
  const [pinWarning, setPinWarning] = useState('')

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail)
  }, [initialEmail])

  // Real-time weak pattern detection
  useEffect(() => {
    if (!pin) {
      setPinWarning('')
      return
    }
    if (pin.length > 0 && !/^\d+$/.test(pin)) {
      setPinWarning('PIN must consist of numbers only.')
      return
    }
    const weakList = ['123456', '654321', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123123', '121212', '012345', '987654']
    if (weakList.includes(pin)) {
      setPinWarning('Warning: Insecure, easily-guessed PIN pattern.')
      return
    }
    if (pin.length === 6 && new Set(pin.split('')).size === 1) {
      setPinWarning('Warning: All identical digits are prohibited.')
      return
    }
    setPinWarning('')
  }, [pin])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!email || !pin || !confirmPin) {
      setLocalError('Please fill in all fields.')
      return
    }

    if (pin.length < 4 || pin.length > 8) {
      setLocalError('Secure PIN must be between 4 and 8 numeric digits (recommended: 6 digits).')
      return
    }

    if (pin !== confirmPin) {
      setLocalError('PIN and Confirmation PIN do not match.')
      return
    }

    if (pinWarning.includes('prohibited') || pinWarning.includes('Insecure')) {
      setLocalError(pinWarning)
      return
    }

    try {
      await setupSecurePin(email.trim(), pin.trim(), confirmPin.trim())
      setLocalSuccess('Secure PIN configured permanently! Redirecting to secure login...')
      setTimeout(() => {
        router.replace('/auth/login')
      }, 1800)
    } catch (err: any) {
      setLocalError(err.message || 'Failed to configure Secure PIN.')
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
          <p className="eyebrow text-cyan-300">One-Time Security Configuration</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight text-slate-50">
            Set Your Permanent<br />
            <span className="text-cyan-300">6-Digit Secure PIN</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            Your Secure PIN serves as your permanent cryptographic knowledge factor during multi-factor authentication. It is salted with bcrypt and permanently associated with your account.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300">
              <Lock className="size-4 text-cyan-400" />
              <span>Configured once: You will never be asked to configure it again.</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>Hardware-independent zero trust factor: Protected against SIM swap and hardware loss.</span>
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
                <KeyRound className="size-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Configure Secure PIN</h2>
              <p className="mt-1 text-xs text-slate-400">
                Create your 6-digit numeric security PIN for MFA access
              </p>
            </div>

            {localError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                <span>{localError}</span>
              </div>
            )}

            {pinWarning && !localError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                <ShieldAlert className="size-4 shrink-0 text-amber-400" />
                <span>{pinWarning}</span>
              </div>
            )}

            {localSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{localSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Account Email
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
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    6-Digit Secure PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200"
                  >
                    {showPin ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showPin ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="??????"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-center text-xl font-mono tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm 6-Digit Secure PIN
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="??????"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-center text-xl font-mono tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !pin || pin.length < 4 || pin !== confirmPin}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Configuring Secure PIN...
                  </>
                ) : (
                  <>
                    Save & Activate MFA
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-white/5 pt-4 text-xs text-slate-400">
              <span>Already configured your PIN? </span>
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

export default function SetupSecurePinPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading setup...</div>}>
      <SetupSecurePinContent />
    </Suspense>
  )
}
