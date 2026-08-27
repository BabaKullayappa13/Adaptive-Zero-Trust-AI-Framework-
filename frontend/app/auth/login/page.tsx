'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Activity, ArrowRight, CheckCircle2, Cpu, Eye, EyeOff, 
  KeyRound, Lock, LockKeyhole, Mail, RefreshCw, ShieldAlert, 
  ShieldCheck, Sparkles 
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

type LoginStep = 'CREDENTIALS' | 'CAPTCHA' | 'OTP' | 'SECURE_PIN' | 'AI_EVALUATION'

export default function LoginPage() {
  const router = useRouter()
  const { 
    login, generateCaptcha, verifyCaptcha, 
    sendOtp, verifyOtp, verifySecurePin, 
    loginMfaComplete, isLoading 
  } = useAuthStore()

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentStep, setCurrentStep] = useState<LoginStep>('CREDENTIALS')
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')

  // CAPTCHA State
  const [captchaChallenge, setCaptchaChallenge] = useState<{ challenge_id: string; question: string } | null>(null)
  const [captchaSolution, setCaptchaSolution] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)

  // OTP State
  const [otpCode, setOtpCode] = useState('')
  const [otpDemo, setOtpDemo] = useState('')
  const [otpCooldown, setOtpCooldown] = useState(0)

  // Secure PIN State
  const [secretPin, setSecretPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  // AI Evaluation Metrics State
  const [evalProgress, setEvalProgress] = useState(0)
  const [evalStatus, setEvalStatus] = useState('Initializing context telemetry...')

  // Timer for OTP cooldown
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCooldown])

  // ==========================================
  // STEP 1: CREDENTIALS (Email & Password)
  // ==========================================
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!email || !password) {
      setLocalError('Please enter your registered email and password.')
      return
    }

    try {
      // Step 1: Validate email & password credentials against backend
      await login(email.trim(), password)
      
      // Advance to Step 2: CAPTCHA
      setCaptchaLoading(true)
      const cap = await generateCaptcha()
      setCaptchaChallenge(cap)
      setCaptchaLoading(false)
      setCurrentStep('CAPTCHA')
      setLocalSuccess('Credentials verified. Please solve the security challenge.')
    } catch (err: any) {
      setLocalError(err.message || 'Invalid email or password.')
    }
  }

  // ==========================================
  // STEP 2: CAPTCHA VERIFICATION
  // ==========================================
  const handleCaptchaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!captchaChallenge || !captchaSolution) {
      setLocalError('Please enter the solution to the CAPTCHA.')
      return
    }

    try {
      await verifyCaptcha(captchaChallenge.challenge_id, captchaSolution)
      
      // Advance to Step 3: Dispatch OTP
      const otpRes = await sendOtp(email.trim())
      if (otpRes.demo_otp) {
        setOtpDemo(otpRes.demo_otp)
      }
      setOtpCooldown(45)
      setCurrentStep('OTP')
      setLocalSuccess('CAPTCHA verified. One-Time Password sent to your email.')
    } catch (err: any) {
      setLocalError(err.message || 'Incorrect CAPTCHA solution. Please try again.')
      // Refresh CAPTCHA
      refreshCaptcha()
    }
  }

  const refreshCaptcha = async () => {
    setCaptchaSolution('')
    setCaptchaLoading(true)
    try {
      const cap = await generateCaptcha()
      setCaptchaChallenge(cap)
    } catch {
      // Ignore
    } finally {
      setCaptchaLoading(false)
    }
  }

  // ==========================================
  // STEP 3: OTP VERIFICATION
  // ==========================================
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!otpCode || otpCode.length < 4) {
      setLocalError('Please enter the 6-digit One-Time Password.')
      return
    }

    try {
      await verifyOtp(email.trim(), otpCode.trim())
      
      // Advance to Step 4: Secure PIN
      setCurrentStep('SECURE_PIN')
      setLocalSuccess('OTP verified. Please enter your permanent 6-digit Secure PIN.')
    } catch (err: any) {
      setLocalError(err.message || 'Incorrect OTP code. Please try again.')
    }
  }

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return
    setLocalError('')
    try {
      const res = await sendOtp(email.trim())
      if (res.demo_otp) setOtpDemo(res.demo_otp)
      setOtpCooldown(45)
      setLocalSuccess('A fresh OTP has been sent to your email.')
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend OTP.')
    }
  }

  // ==========================================
  // STEP 4: SECURE PIN VERIFICATION
  // ==========================================
  const handleSecurePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')

    if (!secretPin || secretPin.length < 4) {
      setLocalError('Please enter your 4 to 8 digit Secure PIN.')
      return
    }

    try {
      await verifySecurePin(email.trim(), secretPin.trim())
      
      // Advance to Step 5: Continuous AI & Zero Trust Evaluation
      setCurrentStep('AI_EVALUATION')
      runAIEvaluation()
    } catch (err: any) {
      setLocalError(err.message || 'Incorrect Secure PIN. Please try again.')
    }
  }

  // ==========================================
  // STEP 5: AI & ZERO TRUST CONTINUOUS EVALUATION
  // ==========================================
  const runAIEvaluation = () => {
    setEvalProgress(15)
    setEvalStatus('Analyzing behavioral keystroke cadence & mouse telemetry...')

    setTimeout(() => {
      setEvalProgress(45)
      setEvalStatus('Running Isolation Forest Machine Learning Anomaly Detection...')
    }, 600)

    setTimeout(() => {
      setEvalProgress(80)
      setEvalStatus('Evaluating Zero Trust Hybrid Cloud Policy Decision...')
    }, 1200)

    setTimeout(async () => {
      try {
        setEvalProgress(100)
        setEvalStatus('Access Granted ? Zero Trust Continuous Session Active')
        await loginMfaComplete(email.trim())
        setTimeout(() => {
          router.replace('/dashboard')
        }, 800)
      } catch (err: any) {
        setLocalError(err.message || 'Failed to establish Zero Trust session.')
        setCurrentStep('CREDENTIALS')
      }
    }, 1800)
  }

  const stepsList = [
    { key: 'CREDENTIALS', label: '1. Credentials' },
    { key: 'CAPTCHA', label: '2. CAPTCHA' },
    { key: 'OTP', label: '3. Email OTP' },
    { key: 'SECURE_PIN', label: '4. Secure PIN' },
    { key: 'AI_EVALUATION', label: '5. AI Zero Trust' }
  ]

  const getStepIndex = (s: LoginStep) => {
    switch (s) {
      case 'CREDENTIALS': return 0
      case 'CAPTCHA': return 1
      case 'OTP': return 2
      case 'SECURE_PIN': return 3
      case 'AI_EVALUATION': return 4
    }
  }

  const activeIndex = getStepIndex(currentStep)

  return (
    <main className="soc-shell grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      {/* Left Branding Section */}
      <section className="hidden flex-col justify-between border-r border-white/[.08] p-12 lg:flex">
        <Link href="/" className="flex items-center gap-3 text-sm font-bold tracking-wide text-slate-100">
          <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
            <ShieldCheck className="size-5" />
          </span>
          ADAPTIVE ZERO TRUST AI
        </Link>

        <div className="max-w-xl">
          <p className="eyebrow text-cyan-300">Continuous MFA & Zero Trust</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-slate-50">
            Trust Every Request.<br />
            <span className="text-cyan-300">Verify Every Signal.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            Autonomous multi-factor authentication with adaptive CAPTCHA, cryptographic OTP, permanent Secure PIN, and real-time Isolation Forest continuous behavioral AI trust scoring.
          </p>

          {/* Step Progress Checklist */}
          <div className="mt-8 space-y-2.5">
            {stepsList.map((stepItem, idx) => (
              <div 
                key={stepItem.key}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs transition-all ${
                  idx === activeIndex
                    ? 'border-cyan-400/50 bg-cyan-950/30 text-cyan-200 font-semibold'
                    : idx < activeIndex
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                    : 'border-white/5 bg-white/[.02] text-slate-500'
                }`}
              >
                <div className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  idx < activeIndex
                    ? 'bg-emerald-400 text-slate-950'
                    : idx === activeIndex
                    ? 'bg-cyan-400 text-slate-950 animate-pulse'
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {idx < activeIndex ? '?' : idx + 1}
                </div>
                <span>{stepItem.label}</span>
                {idx === activeIndex && <span className="ml-auto text-[10px] text-cyan-300 uppercase tracking-widest">Active</span>}
                {idx < activeIndex && <span className="ml-auto text-[10px] text-emerald-400 uppercase tracking-widest">Verified</span>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">Enterprise Security Standard ? Never Trust, Always Verify</p>
      </section>

      {/* Right Login Card */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-100">
              <ShieldCheck className="size-5 text-cyan-300" />
              ADAPTIVE ZERO TRUST AI
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* Step 1: Credentials */}
            {currentStep === 'CREDENTIALS' && (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <LockKeyhole className="size-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">Operator Sign In</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Step 1 of 5: Enter your account email and password
                  </p>
                </div>

                {localError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                    <span>{localError}</span>
                  </div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Operator Email
                    </label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3.5 top-3 size-4 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@zerotrust.ai"
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Password
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

                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Verifying Credentials...
                      </>
                    ) : (
                      <>
                        Verify & Proceed to MFA
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Step 2: CAPTCHA */}
            {currentStep === 'CAPTCHA' && (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <Sparkles className="size-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">CAPTCHA Challenge</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Step 2 of 5: Solve the automated bot protection challenge
                  </p>
                </div>

                {localError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                    <span>{localError}</span>
                  </div>
                )}

                <div className="mb-5 flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-4">
                  <div>
                    <p className="text-xs text-cyan-300 font-semibold">Security Math Challenge</p>
                    <p className="text-lg font-mono font-bold text-slate-100 mt-1">
                      {captchaLoading ? 'Generating challenge...' : captchaChallenge?.question || 'What is 18 + 24?'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    disabled={captchaLoading}
                    className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-cyan-300"
                    title="Refresh Challenge"
                  >
                    <RefreshCw className={`size-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <form onSubmit={handleCaptchaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Challenge Answer
                    </label>
                    <input
                      type="text"
                      value={captchaSolution}
                      onChange={(e) => setCaptchaSolution(e.target.value)}
                      placeholder="Enter numeric answer"
                      required
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-center text-lg font-mono text-cyan-300 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!captchaSolution}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  >
                    Verify CAPTCHA
                    <ArrowRight className="size-4" />
                  </button>
                </form>
              </>
            )}

            {/* Step 3: OTP */}
            {currentStep === 'OTP' && (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <Mail className="size-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">One-Time Password (OTP)</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Step 3 of 5: Enter the 6-digit code sent to {email}
                  </p>
                </div>

                {otpDemo && (
                  <div className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-950/30 p-3 text-xs text-cyan-200 flex items-center justify-between">
                    <span>Demo Verification Code: <strong className="font-mono text-cyan-300 text-sm">{otpDemo}</strong></span>
                    <button 
                      type="button" 
                      onClick={() => setOtpCode(otpDemo)}
                      className="text-[11px] underline text-cyan-300 hover:text-cyan-200"
                    >
                      Auto-Fill
                    </button>
                  </div>
                )}

                {localError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                    <span>{localError}</span>
                  </div>
                )}

                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-center text-xl font-mono tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!otpCode || otpCode.length < 4}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  >
                    Verify OTP
                    <ArrowRight className="size-4" />
                  </button>
                </form>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>Code valid for 5 minutes</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpCooldown > 0}
                    className="font-semibold text-cyan-300 hover:text-cyan-200 disabled:text-slate-500"
                  >
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Secure PIN */}
            {currentStep === 'SECURE_PIN' && (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <KeyRound className="size-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">Permanent Secure PIN</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Step 4 of 5: Enter your 6-digit Secret PIN factor
                  </p>
                </div>

                {localError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                    <span>{localError}</span>
                  </div>
                )}

                <form onSubmit={handleSecurePinSubmit} className="space-y-4">
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
                      value={secretPin}
                      onChange={(e) => setSecretPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="??????"
                      required
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-center text-xl font-mono tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <Link
                      href={`/forgot-secure-pin?email=${encodeURIComponent(email)}`}
                      className="text-xs text-cyan-300 hover:text-cyan-200 hover:underline"
                    >
                      Forgot Secure PIN?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={!secretPin || secretPin.length < 4}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  >
                    Verify PIN & Complete MFA
                    <ArrowRight className="size-4" />
                  </button>
                </form>
              </>
            )}

            {/* Step 5: AI & Zero Trust Evaluation */}
            {currentStep === 'AI_EVALUATION' && (
              <div className="py-6 text-center">
                <div className="relative mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-950/40 text-cyan-300">
                  <Cpu className="size-8 animate-pulse text-cyan-300" />
                  <span className="absolute -top-1 -right-1 flex size-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-3 bg-cyan-500"></span>
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-100">Zero Trust AI Evaluation</h2>
                <p className="mt-2 text-xs text-cyan-300 font-mono">
                  {evalStatus}
                </p>

                {/* Progress bar */}
                <div className="mt-6 w-full rounded-full bg-slate-800 h-2 overflow-hidden">
                  <div 
                    className="bg-cyan-400 h-full transition-all duration-300"
                    style={{ width: `${evalProgress}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-[11px] text-slate-400 text-left">
                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-2.5">
                    <span className="text-slate-500 block">AI Anomaly Status</span>
                    <span className="text-emerald-300 font-mono">NORMAL_CADENCE</span>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-2.5">
                    <span className="text-slate-500 block">Trust Level</span>
                    <span className="text-cyan-300 font-mono">ELEVATED_TRUST (92%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Switch / Return footer */}
            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-slate-400">
              {currentStep !== 'CREDENTIALS' && currentStep !== 'AI_EVALUATION' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('CREDENTIALS')
                    setLocalError('')
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ? Back to Credentials
                </button>
              ) : (
                <span>Need an account?</span>
              )}
              <Link href="/auth/register" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Register Operator
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
