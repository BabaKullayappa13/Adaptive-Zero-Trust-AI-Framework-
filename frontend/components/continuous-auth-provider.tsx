'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldAlert, KeyRound, CheckCircle2, Lock, ArrowRight, Activity,
  Clock, Shield, AlertTriangle, Eye, EyeOff, Unlock, UserCheck
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { continuousCollector } from '@/lib/continuous-auth'
import apiClient, { getApiErrorMessage } from '@/lib/api'

type SessionLifecycleState = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'RE_AUTH_REQUIRED'

interface ContinuousAuthContextType {
  trustScore: number
  riskScore: number
  confidenceScore: number
  trustLevel: string
  riskLevel: string
  isMonitoring: boolean
  sessionState: SessionLifecycleState
  idleSeconds: number
  inactivityThreshold: number
  triggerManualCheck: () => Promise<void>
  lockSessionManually: () => Promise<void>
  setInactivityThresholdSeconds: (seconds: number) => void
}

const ContinuousAuthContext = createContext<ContinuousAuthContextType>({
  trustScore: 82.0,
  riskScore: 18.0,
  confidenceScore: 92.0,
  trustLevel: 'TRUSTED',
  riskLevel: 'LOW',
  isMonitoring: false,
  sessionState: 'ACTIVE',
  idleSeconds: 0,
  inactivityThreshold: 600,
  triggerManualCheck: async () => {},
  lockSessionManually: async () => {},
  setInactivityThresholdSeconds: () => {},
})

export const useContinuousAuth = () => useContext(ContinuousAuthContext)

export default function ContinuousAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, accessToken, sessionId, logout } = useAuthStore()

  const [trustScore, setTrustScore] = useState<number>(82.0)
  const [riskScore, setRiskScore] = useState<number>(18.0)
  const [confidenceScore, setConfidenceScore] = useState<number>(90.0)
  const [trustLevel, setTrustLevel] = useState<string>('TRUSTED')
  const [riskLevel, setRiskLevel] = useState<string>('LOW')
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false)

  // Activity-Based Session Lifecycle
  const [sessionState, setSessionState] = useState<SessionLifecycleState>('ACTIVE')
  const [idleSeconds, setIdleSeconds] = useState<number>(0)
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(600) // Default 10 min
  const lastActivityTimeRef = useRef<number>(Date.now())
  const activityCountRef = useRef<number>(0)

  // Step-Up Modal State
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const [stepUpReason, setStepUpReason] = useState('')
  const [stepUpPin, setStepUpPin] = useState('')
  const [stepUpLoading, setStepUpLoading] = useState(false)
  const [stepUpError, setStepUpError] = useState<string | null>(null)
  const [stepUpSuccess, setStepUpSuccess] = useState(false)

  // Session Lock Unlock Modal State
  const [unlockMethod, setUnlockMethod] = useState<'PIN' | 'PASSWORD'>('PIN')
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockPassword, setUnlockPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlockSuccess, setUnlockSuccess] = useState(false)

  // Load configured threshold from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedThreshold = localStorage.getItem('azt_inactivity_threshold')
      if (savedThreshold) {
        const val = parseInt(savedThreshold, 10)
        if (!isNaN(val) && val >= 60) setInactivityThreshold(val)
      }
    }
  }, [])

  const setInactivityThresholdSeconds = (seconds: number) => {
    setInactivityThreshold(seconds)
    if (typeof window !== 'undefined') {
      localStorage.setItem('azt_inactivity_threshold', String(seconds))
    }
  }

  // 1. Activity Listeners (Mouse, clicks, keys, scroll, forms, navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now()
      activityCountRef.current += 1
      if (sessionState === 'INACTIVE') {
        setSessionState('ACTIVE')
      }
    }

    const events = ['mousemove', 'pointerdown', 'click', 'keydown', 'scroll', 'touchstart', 'input', 'focus']
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }))

    // Visibility change (Screen unavailable / hidden)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab backgrounded or screen locked
        if (sessionState === 'ACTIVE') {
          setSessionState('INACTIVE')
        }
      } else {
        handleUserActivity()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [sessionState])

  // 2. Activity Monitoring & Heartbeat Interval (checks idle time every 5 seconds)
  useEffect(() => {
    if (!user || !accessToken) return

    const checkInterval = setInterval(async () => {
      if (sessionState === 'LOCKED' || sessionState === 'RE_AUTH_REQUIRED') return

      const now = Date.now()
      const idle = Math.floor((now - lastActivityTimeRef.current) / 1000)
      setIdleSeconds(idle)

      // Warning when 80% of threshold reached -> INACTIVE
      if (idle >= Math.floor(inactivityThreshold * 0.8) && idle < inactivityThreshold) {
        if (sessionState !== 'INACTIVE') setSessionState('INACTIVE')
      }

      // Reached or exceeded threshold -> Transition to LOCKED
      if (idle >= inactivityThreshold) {
        setSessionState('LOCKED')
        try {
          await apiClient.lockSession(sessionId ? Number(sessionId) : undefined, 'Inactivity threshold exceeded')
        } catch {
          // Locked locally
        }
        return
      }

      // Send periodic heartbeat to backend every 30 seconds
      if (activityCountRef.current > 0 || idle % 30 < 5) {
        try {
          const res = await apiClient.sendSessionHeartbeat(
            idle,
            sessionId ? Number(sessionId) : undefined,
            activityCountRef.current
          )
          activityCountRef.current = 0
          if (res.data?.locked) {
            setSessionState('LOCKED')
          }
        } catch {
          // Non-blocking heartbeat failure
        }
      }
    }, 5000)

    return () => clearInterval(checkInterval)
  }, [user, accessToken, sessionId, inactivityThreshold, sessionState])

  // 3. Continuous Collector Integration
  const handleScoreUpdate = useCallback((data: {
    trust_score: number
    risk_score: number
    confidence_score: number
    trust_level: string
    risk_level: string
  }) => {
    setTrustScore(data.trust_score)
    setRiskScore(data.risk_score)
    setConfidenceScore(data.confidence_score)
    setTrustLevel(data.trust_level)
    setRiskLevel(data.risk_level)
  }, [])

  const handleStepUpRequired = useCallback((details: { reason: string; risk_score: number }) => {
    setStepUpReason(details.reason)
    setStepUpOpen(true)
    setStepUpError(null)
    setStepUpSuccess(false)
  }, [])

  const handleSessionTerminated = useCallback((details: { reason: string }) => {
    alert(`Zero Trust Policy Decision: ${details.reason}`)
    void logout()
    router.push('/auth/login?terminated=1')
  }, [logout, router])

  useEffect(() => {
    if (user && accessToken && sessionId) {
      setIsMonitoring(true)
      continuousCollector.start(Number(sessionId), {
        onScoreUpdate: handleScoreUpdate,
        onStepUpRequired: handleStepUpRequired,
        onSessionTerminated: handleSessionTerminated,
      })

      return () => {
        continuousCollector.stop()
        setIsMonitoring(false)
      }
    }
  }, [user, accessToken, sessionId, handleScoreUpdate, handleStepUpRequired, handleSessionTerminated])

  const triggerManualCheck = async () => {
    if (isMonitoring) {
      await continuousCollector.flushAndSendTelemetry()
    }
  }

  const lockSessionManually = async () => {
    setSessionState('LOCKED')
    try {
      await apiClient.lockSession(sessionId ? Number(sessionId) : undefined, 'Manual User Lock')
    } catch {
      // Local lock enforced
    }
  }

  // Handle Step-Up Verification
  const handleStepUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stepUpPin || stepUpPin.length < 4) {
      setStepUpError('Please enter your 4 to 8 digit Secret PIN.')
      return
    }

    setStepUpLoading(true)
    setStepUpError(null)

    try {
      const activeSessionId = sessionId ? Number(sessionId) : 1
      const res = await apiClient.submitStepUpVerification(activeSessionId, stepUpPin)
      if (res.data.success) {
        setStepUpSuccess(true)
        setTrustScore(res.data.trust_score || 85.0)
        setRiskScore(res.data.risk_score || 15.0)
        setTrustLevel('TRUSTED')
        setRiskLevel('LOW')
        setTimeout(() => {
          setStepUpOpen(false)
          setStepUpPin('')
          setStepUpSuccess(false)
        }, 1200)
      }
    } catch (err: any) {
      setStepUpError(getApiErrorMessage(err, 'Incorrect Secret PIN. Please try again.'))
    } finally {
      setStepUpLoading(false)
    }
  }

  // Handle Unlocking the Session
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUnlockLoading(true)
    setUnlockError(null)

    try {
      const payload: { sessionId?: number; secretPin?: string; password?: string } = {
        sessionId: sessionId ? Number(sessionId) : undefined,
      }
      if (unlockMethod === 'PIN') {
        if (!unlockPin || unlockPin.length < 4) {
          setUnlockError('Please enter your 4 to 8 digit Secret PIN.')
          setUnlockLoading(false)
          return
        }
        payload.secretPin = unlockPin
      } else {
        if (!unlockPassword) {
          setUnlockError('Please enter your password.')
          setUnlockLoading(false)
          return
        }
        payload.password = unlockPassword
      }

      const res = await apiClient.unlockSession(payload)
      if (res.data?.unlocked || res.data?.session_status === 'ACTIVE') {
        setUnlockSuccess(true)
        lastActivityTimeRef.current = Date.now()
        setIdleSeconds(0)
        setTimeout(() => {
          setSessionState('ACTIVE')
          setUnlockPin('')
          setUnlockPassword('')
          setUnlockSuccess(false)
        }, 1000)
      }
    } catch (err: any) {
      setUnlockError(getApiErrorMessage(err, 'Verification failed. Incorrect credentials provided.'))
    } finally {
      setUnlockLoading(false)
    }
  }

  return (
    <ContinuousAuthContext.Provider
      value={{
        trustScore,
        riskScore,
        confidenceScore,
        trustLevel,
        riskLevel,
        isMonitoring,
        sessionState,
        idleSeconds,
        inactivityThreshold,
        triggerManualCheck,
        lockSessionManually,
        setInactivityThresholdSeconds,
      }}
    >
      {children}

      {/* ============================================================== */}
      {/* ACTIVITY-BASED SESSION LOCK OVERLAY DIALOG                      */}
      {/* ============================================================== */}
      {sessionState === 'LOCKED' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-950/80 text-slate-100">
            <div className="mb-5 flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-500/30">
                <Lock className="size-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Session Inactive & Locked</h3>
                <p className="text-xs text-cyan-300/80">Adaptive Zero-Trust Activity Protection</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 mb-5 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="size-3.5 text-cyan-400" />
                Inactivity Threshold Exceeded
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Zero interactions detected for <span className="text-cyan-300 font-mono font-semibold">{idleSeconds}s</span> (configured limit: {Math.round(inactivityThreshold / 60)} min). Your account remains active, but re-authentication is required to resume.
              </p>
            </div>

            {unlockSuccess ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-300">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-semibold">Verification successful. Restoring active session...</span>
              </div>
            ) : (
              <form onSubmit={handleUnlockSubmit} className="space-y-4">
                {/* Method Selector Tabs */}
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-1">
                  <button
                    type="button"
                    onClick={() => { setUnlockMethod('PIN'); setUnlockError(null) }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      unlockMethod === 'PIN'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <KeyRound className="size-3.5" />
                    Secret PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUnlockMethod('PASSWORD'); setUnlockError(null) }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      unlockMethod === 'PASSWORD'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Lock className="size-3.5" />
                    Account Password
                  </button>
                </div>

                {unlockMethod === 'PIN' ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Enter 4-8 Digit Secret PIN
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={8}
                        value={unlockPin}
                        onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-center text-xl font-mono tracking-[0.3em] text-cyan-300 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                        autoFocus
                        disabled={unlockLoading}
                        required
                      />
                      <KeyRound className="absolute left-3 top-3.5 size-4 text-slate-500" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Enter Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={unlockPassword}
                        onChange={(e) => setUnlockPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none pr-10"
                        autoFocus
                        disabled={unlockLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {unlockError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{unlockError}</span>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={unlockLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition-colors disabled:opacity-50"
                  >
                    {unlockLoading ? 'Verifying Credentials...' : 'Unlock Session & Resume'}
                    <Unlock className="size-4" />
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 text-cyan-400/80">
                <Shield className="size-3" />
                Zero-Trust NIST SP 800-207
              </span>
              <button
                type="button"
                onClick={() => { void logout(); router.push('/auth/login') }}
                className="text-rose-400 hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* INTERACTIVE STEP-UP CHALLENGE MODAL                            */}
      {/* ============================================================== */}
      {stepUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-slate-900 p-6 shadow-2xl shadow-amber-500/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
                <ShieldAlert className="size-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Step-Up Verification Required</h3>
                <p className="text-xs text-amber-200/80">Adaptive Zero Trust Continuous Challenge</p>
              </div>
            </div>

            <p className="mb-5 text-sm leading-6 text-slate-300">
              {stepUpReason || 'A behavioral deviation or contextual risk signal was detected in your active session. Confirm your identity with your Secret PIN to maintain access.'}
            </p>

            {stepUpSuccess ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-300">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">Identity verified. Full trust restored.</span>
              </div>
            ) : (
              <form onSubmit={handleStepUpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Enter Secret PIN
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={stepUpPin}
                      onChange={(e) => setStepUpPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-center text-xl font-mono tracking-[0.3em] text-amber-300 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                      autoFocus
                      disabled={stepUpLoading}
                      required
                    />
                    <KeyRound className="absolute left-3 top-3 size-5 text-slate-500" />
                  </div>
                </div>

                {stepUpError && (
                  <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">
                    {stepUpError}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={stepUpLoading || !stepUpPin}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors disabled:opacity-50"
                  >
                    {stepUpLoading ? 'Verifying PIN...' : 'Verify Secret PIN'}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Lock className="size-3 text-cyan-400" />
                Bcrypt Hashed Verification
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="size-3 text-emerald-400" />
                Live Telemetry Active
              </span>
            </div>
          </div>
        </div>
      )}
    </ContinuousAuthContext.Provider>
  )
}
