'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowRight, CheckCircle2, Cpu, Eye, EyeOff, 
  KeyRound, Lock, LockKeyhole, Mail, RefreshCw, ShieldAlert, 
  ShieldCheck, Fingerprint, AlertTriangle, XCircle, Activity 
} from 'lucide-react'
import { useAuthStore, type LoginEvaluationData } from '@/lib/auth-store'
import { continuousCollector } from '@/lib/continuous-auth'
import Link from 'next/link'

type LoginStep = 'CREDENTIALS' | 'SECURE_PIN' | 'AI_EVALUATION'
type EvaluationState = 
  | 'EVALUATION_IN_PROGRESS' 
  | 'EVALUATION_SUCCESSFUL' 
  | 'NORMAL_ACTIVITY_DETECTED' 
  | 'ANOMALOUS_ACTIVITY_DETECTED' 
  | 'ACCESS_RESTRICTED_BY_POLICY' 
  | 'MODEL_UNAVAILABLE' 
  | 'EVALUATION_FAILED'

export default function LoginPage() {
  const router = useRouter()
  const { 
    login, verifySecurePin, 
    loginMfaComplete,
    resendEmailVerification, isLoading 
  } = useAuthStore()

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentStep, setCurrentStep] = useState<LoginStep>('CREDENTIALS')
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  // Resend cooldown countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Secure PIN State
  const [secretPin, setSecretPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  // AI Evaluation Metrics State
  const [evalProgress, setEvalProgress] = useState(0)
  const [evalStatus, setEvalStatus] = useState('Initializing context telemetry...')
  const [evaluationState, setEvaluationState] = useState<EvaluationState>('EVALUATION_IN_PROGRESS')
  const [evaluationData, setEvaluationData] = useState<LoginEvaluationData | null>(null)

  // Start continuous telemetry tracking on mount to record real behavioral keystroke/mouse dynamics during login
  useEffect(() => {
    continuousCollector.startListening()
    return () => {
      continuousCollector.stop()
    }
  }, [])

  // ==========================================
  // STEP 1: CREDENTIALS (Email & Password)
  // ==========================================
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setLocalSuccess('')
    setEmailNotVerified(false)
    setResendMsg('')

    if (!email || !password) {
      setLocalError('Please enter your registered email and password.')
      return
    }

    try {
      const res = await login(email.trim(), password)
      
      // If user needs to configure Secure PIN for the first time
      if (res && res.secure_pin_configured === false) {
        router.replace(`/setup-secure-pin?email=${encodeURIComponent(email.trim())}`)
        return
      }

      // Advance to Step 2: Secure PIN MFA
      setCurrentStep('SECURE_PIN')
      setLocalSuccess('Credentials verified. Please enter your 6-digit Secure PIN.')
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password.'
      if (msg.toLowerCase().includes('not verified') || msg.toLowerCase().includes('verification link')) {
        setEmailNotVerified(true)
        setLocalError('Your email address has not yet been verified. Please open the link sent to your inbox or enter your verification code.')
      } else {
        setLocalError(msg)
      }
    }
  }

  // ==========================================
  // RESEND EMAIL VERIFICATION
  // ==========================================
  const handleResendVerification = async () => {
    if (!email) {
      setLocalError('Please enter your registered email address.')
      return
    }
    setResendLoading(true)
    setResendMsg('')
    try {
      await resendEmailVerification(email.trim())
      setResendMsg('Verification email resent! Please check your inbox.')
      setResendCooldown(30)
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend verification email.')
    } finally {
      setResendLoading(false)
    }
  }

  // ==========================================
  // STEP 2 & 3: SECURE PIN & CONTINUOUS AI EVALUATION
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
      setCurrentStep('AI_EVALUATION')
      setEvaluationState('EVALUATION_IN_PROGRESS')
      setEvalProgress(35)
      setEvalStatus('Verifying cryptographic Secure PIN and client context...')

      await verifySecurePin(email.trim(), secretPin.trim())

      setEvalProgress(70)
      setEvalStatus('Running Isolation Forest Machine Learning & Zero Trust Policy Engine...')

      const telemetrySnapshot = continuousCollector.getTelemetrySnapshot()
      const res = await loginMfaComplete(email.trim(), undefined, secretPin.trim(), telemetrySnapshot)

      const evalData = res.evaluation
      if (evalData) {
        setEvaluationData(evalData)
        setEvalProgress(100)

        // Evaluate genuine status based on backend model & policy results
        if (evalData.policy_decision === 'DENY' || evalData.status === 'ACCESS_RESTRICTED_BY_POLICY') {
          setEvaluationState('ACCESS_RESTRICTED_BY_POLICY')
          setEvalStatus('Access restricted by configured Zero Trust policy.')
          return
        }

        if (evalData.model_status !== 'OPERATIONAL' || evalData.status === 'MODEL_UNAVAILABLE') {
          setEvaluationState('MODEL_UNAVAILABLE')
          setEvalStatus('ML model unavailable — Zero Trust policy evaluated via rule fallback.')
        } else if (evalData.ai_anomaly_status === 'ANOMALOUS_BEHAVIOR' || evalData.ai_anomaly_score >= 60) {
          setEvaluationState('ANOMALOUS_ACTIVITY_DETECTED')
          setEvalStatus('Anomalous cadence detected by Isolation Forest.')
        } else {
          setEvaluationState('NORMAL_ACTIVITY_DETECTED')
          setEvalStatus('Normal activity cadence verified. Zero Trust continuous session active.')
        }

        setTimeout(() => {
          router.replace('/dashboard')
        }, 1200)
      } else {
        setEvalProgress(100)
        setEvaluationState('EVALUATION_SUCCESSFUL')
        setEvalStatus('Access Granted - Zero Trust Continuous Session Active')
        setTimeout(() => {
          router.replace('/dashboard')
        }, 600)
      }
    } catch (err: any) {
      setEvaluationState('EVALUATION_FAILED')
      setEvalStatus(err.message || 'Evaluation failed. Authentication rejected.')
      setLocalError(err.message || 'Incorrect Secure PIN or Zero Trust verification failed.')
      setTimeout(() => {
        setCurrentStep('SECURE_PIN')
      }, 2500)
    }
  }

  const stepsList = [
    { key: 'CREDENTIALS', label: '1. Primary Credentials' },
    { key: 'SECURE_PIN', label: '2. Permanent Secure PIN' },
    { key: 'AI_EVALUATION', label: '3. Zero Trust AI Evaluation' }
  ]

  const getStepIndex = (s: LoginStep) => {
    switch (s) {
      case 'CREDENTIALS': return 0
      case 'SECURE_PIN': return 1
      case 'AI_EVALUATION': return 2
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
            Autonomous multi-factor authentication with verified email identity via Neon Auth, permanent Secure PIN protection, and real-time Isolation Forest continuous behavioral AI trust scoring.
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
                  {idx < activeIndex ? '✓' : idx + 1}
                </div>
                <span>{stepItem.label}</span>
                {idx === activeIndex && <span className="ml-auto text-[10px] text-cyan-300 uppercase tracking-widest">Active</span>}
                {idx < activeIndex && <span className="ml-auto text-[10px] text-emerald-400 uppercase tracking-widest">Verified</span>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">Enterprise Security Standard - Never Trust, Always Verify</p>
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
                    Step 1 of 3: Enter your account email and password
                  </p>
                </div>

                {localError && !emailNotVerified && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                    <span>{localError}</span>
                  </div>
                )}

                {/* Email Verification Required Dedicated Card */}
                {emailNotVerified && (
                  <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="size-5 shrink-0 text-amber-400 mt-0.5" />
                      <div className="space-y-1.5 flex-1">
                        <div className="font-semibold text-amber-200">Email Verification Required</div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          Account access is restricted until your email address is verified. We sent a verification link to <strong className="text-white">{email}</strong>.
                        </p>
                        {resendMsg && (
                          <div className="text-xs text-emerald-400 font-medium">{resendMsg}</div>
                        )}
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendLoading || resendCooldown > 0}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resendLoading ? (
                              <>
                                <RefreshCw className="size-3.5 animate-spin" />
                                Resending...
                              </>
                            ) : resendCooldown > 0 ? (
                              `Resend in ${resendCooldown}s`
                            ) : (
                              'Resend Verification Email'
                            )}
                          </button>
                          <Link
                            href={`/verify-email?email=${encodeURIComponent(email)}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200 underline ml-auto"
                          >
                            Enter Verification Code &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
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
                        placeholder="operator@zerotrust.ai"
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
                        placeholder="••••••••••••"
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
                        Verify & Proceed to Secure PIN
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Step 2: Secure PIN */}
            {currentStep === 'SECURE_PIN' && (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <KeyRound className="size-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">Permanent Secure PIN</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Step 2 of 3: Enter your 6-digit Secret PIN factor
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
                      placeholder="••••••"
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

            {/* Step 3: AI & Zero Trust Evaluation */}
            {currentStep === 'AI_EVALUATION' && (
              <div className="py-4 text-center">
                <div className={`relative mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border transition-all ${
                  evaluationState === 'NORMAL_ACTIVITY_DETECTED' || evaluationState === 'EVALUATION_SUCCESSFUL'
                    ? 'border-emerald-400/40 bg-emerald-950/40 text-emerald-300'
                    : evaluationState === 'ANOMALOUS_ACTIVITY_DETECTED'
                    ? 'border-amber-400/40 bg-amber-950/40 text-amber-300'
                    : evaluationState === 'ACCESS_RESTRICTED_BY_POLICY' || evaluationState === 'EVALUATION_FAILED'
                    ? 'border-rose-400/40 bg-rose-950/40 text-rose-300'
                    : evaluationState === 'MODEL_UNAVAILABLE'
                    ? 'border-yellow-400/40 bg-yellow-950/40 text-yellow-300'
                    : 'border-cyan-400/40 bg-cyan-950/40 text-cyan-300'
                }`}>
                  {evaluationState === 'EVALUATION_IN_PROGRESS' && (
                    <>
                      <Cpu className="size-8 animate-pulse text-cyan-300" />
                      <span className="absolute -top-1 -right-1 flex size-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-3 bg-cyan-500"></span>
                      </span>
                    </>
                  )}
                  {(evaluationState === 'NORMAL_ACTIVITY_DETECTED' || evaluationState === 'EVALUATION_SUCCESSFUL') && (
                    <ShieldCheck className="size-8 text-emerald-400" />
                  )}
                  {evaluationState === 'ANOMALOUS_ACTIVITY_DETECTED' && (
                    <ShieldAlert className="size-8 text-amber-400" />
                  )}
                  {(evaluationState === 'ACCESS_RESTRICTED_BY_POLICY' || evaluationState === 'EVALUATION_FAILED') && (
                    <XCircle className="size-8 text-rose-400" />
                  )}
                  {evaluationState === 'MODEL_UNAVAILABLE' && (
                    <AlertTriangle className="size-8 text-yellow-400" />
                  )}
                </div>

                <h2 className="text-xl font-bold text-slate-100">Zero Trust AI Evaluation</h2>
                
                {/* State Label Pill */}
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-medium border border-white/10 bg-white/[.03]">
                  <span className={`size-2 rounded-full ${
                    evaluationState === 'NORMAL_ACTIVITY_DETECTED' || evaluationState === 'EVALUATION_SUCCESSFUL'
                      ? 'bg-emerald-400'
                      : evaluationState === 'ANOMALOUS_ACTIVITY_DETECTED'
                      ? 'bg-amber-400'
                      : evaluationState === 'ACCESS_RESTRICTED_BY_POLICY' || evaluationState === 'EVALUATION_FAILED'
                      ? 'bg-rose-400'
                      : evaluationState === 'MODEL_UNAVAILABLE'
                      ? 'bg-yellow-400'
                      : 'bg-cyan-400 animate-pulse'
                  }`} />
                  <span className="text-slate-300">
                    {evaluationState === 'EVALUATION_IN_PROGRESS' && 'Evaluation in progress'}
                    {evaluationState === 'EVALUATION_SUCCESSFUL' && 'Evaluation successful'}
                    {evaluationState === 'NORMAL_ACTIVITY_DETECTED' && 'Normal activity detected'}
                    {evaluationState === 'ANOMALOUS_ACTIVITY_DETECTED' && 'Anomalous activity detected'}
                    {evaluationState === 'ACCESS_RESTRICTED_BY_POLICY' && 'Access restricted by policy'}
                    {evaluationState === 'MODEL_UNAVAILABLE' && 'Model unavailable'}
                    {evaluationState === 'EVALUATION_FAILED' && 'Evaluation failed'}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400 font-mono">
                  {evalStatus}
                </p>

                {/* Dynamic Progress Bar */}
                <div className="mt-4 w-full rounded-full bg-slate-800 h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      evaluationState === 'NORMAL_ACTIVITY_DETECTED' || evaluationState === 'EVALUATION_SUCCESSFUL'
                        ? 'bg-emerald-400'
                        : evaluationState === 'ANOMALOUS_ACTIVITY_DETECTED'
                        ? 'bg-amber-400'
                        : evaluationState === 'ACCESS_RESTRICTED_BY_POLICY' || evaluationState === 'EVALUATION_FAILED'
                        ? 'bg-rose-500'
                        : evaluationState === 'MODEL_UNAVAILABLE'
                        ? 'bg-yellow-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${evalProgress}%` }}
                  />
                </div>

                {/* Real Verified Evaluation Metrics Grid */}
                <div className="mt-5 grid grid-cols-2 gap-2.5 text-[11px] text-slate-400 text-left">
                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-2.5">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">AI Anomaly Status</span>
                    {evaluationData ? (
                      <span className={`font-mono font-semibold ${
                        evaluationData.ai_anomaly_status === 'NORMAL_CADENCE' ? 'text-emerald-300' : 'text-amber-300'
                      }`}>
                        {evaluationData.ai_anomaly_status}
                      </span>
                    ) : evaluationState === 'MODEL_UNAVAILABLE' ? (
                      <span className="text-yellow-400 font-mono">UNAVAILABLE</span>
                    ) : evaluationState === 'EVALUATION_FAILED' ? (
                      <span className="text-rose-400 font-mono">ERROR</span>
                    ) : (
                      <span className="text-cyan-300/80 font-mono animate-pulse">EVALUATING...</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-2.5">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Trust Level</span>
                    {evaluationData ? (
                      <span className={`font-mono font-semibold ${
                        evaluationData.trust_score >= 80 ? 'text-cyan-300' : evaluationData.trust_score >= 50 ? 'text-amber-300' : 'text-rose-300'
                      }`}>
                        {evaluationData.trust_level} ({Math.round(evaluationData.trust_score)}%)
                      </span>
                    ) : evaluationState === 'MODEL_UNAVAILABLE' ? (
                      <span className="text-yellow-400 font-mono">DEGRADED_TRUST</span>
                    ) : evaluationState === 'EVALUATION_FAILED' ? (
                      <span className="text-rose-400 font-mono">REVOKED (0%)</span>
                    ) : (
                      <span className="text-cyan-300/80 font-mono animate-pulse">CALCULATING...</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-2.5">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Policy Decision</span>
                    <span className="font-mono text-slate-200">
                      {evaluationData ? evaluationData.policy_decision : 'EVALUATING...'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-2.5">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Model Status</span>
                    <span className="font-mono text-slate-200">
                      {evaluationData ? `${evaluationData.model_version} (${evaluationData.model_status})` : 'CHECKING...'}
                    </span>
                  </div>
                </div>

                {/* Explicit Reasons from Isolation Forest & Zero Trust Policy Engine */}
                {evaluationData?.reasons && evaluationData.reasons.length > 0 && (
                  <div className="mt-3 rounded-xl border border-white/5 bg-white/[.015] p-2.5 text-left text-[11px] text-slate-400 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Verification Signals:</span>
                    {evaluationData.reasons.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-cyan-400 text-xs">•</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Policy Denial / Error Banner */}
                {evaluationState === 'ACCESS_RESTRICTED_BY_POLICY' && (
                  <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 text-left">
                    <p className="font-semibold">Access Denied by Policy Engine</p>
                    <p className="mt-1 text-slate-400 text-[11px]">
                      Your request violates Zero Trust risk thresholds. Contact your security administrator to request access.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep('CREDENTIALS')
                        setEvaluationState('EVALUATION_IN_PROGRESS')
                        setEvaluationData(null)
                      }}
                      className="mt-3 w-full rounded-lg bg-rose-500/20 py-1.5 text-center text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
                    >
                      Return to Sign In
                    </button>
                  </div>
                )}
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
                  &larr; Back to Credentials
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
