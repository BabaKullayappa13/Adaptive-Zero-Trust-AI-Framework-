'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, KeyRound, CheckCircle2, Lock, ArrowRight, Activity } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { continuousCollector } from '@/lib/continuous-auth'
import { apiClient } from '@/lib/api'

interface ContinuousAuthContextType {
  trustScore: number
  riskScore: number
  confidenceScore: number
  trustLevel: string
  riskLevel: string
  isMonitoring: boolean
  triggerManualCheck: () => Promise<void>
}

const ContinuousAuthContext = createContext<ContinuousAuthContextType>({
  trustScore: 85,
  riskScore: 15,
  confidenceScore: 92,
  trustLevel: 'TRUSTED',
  riskLevel: 'LOW',
  isMonitoring: false,
  triggerManualCheck: async () => {},
})

export const useContinuousAuth = () => useContext(ContinuousAuthContext)

export default function ContinuousAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, accessToken, sessionId, logout } = useAuthStore()

  const [trustScore, setTrustScore] = useState<number>(82.0)
  const [riskScore, setRiskScore] = useState<number>(15.0)
  const [confidenceScore, setConfidenceScore] = useState<number>(90.0)
  const [trustLevel, setTrustLevel] = useState<string>('TRUSTED')
  const [riskLevel, setRiskLevel] = useState<string>('LOW')
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false)

  // Step-Up Modal State
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const [stepUpReason, setStepUpReason] = useState('')
  const [secretPin, setSecretPin] = useState('')
  const [stepUpLoading, setStepUpLoading] = useState(false)
  const [stepUpError, setStepUpError] = useState<string | null>(null)
  const [stepUpSuccess, setStepUpSuccess] = useState(false)

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
    alert(`Zero Trust Alert: ${details.reason}`)
    void logout()
    router.push('/auth/login?terminated=1')
  }, [logout, router])

  useEffect(() => {
    if (user && accessToken && sessionId) {
      setIsMonitoring(true)
      continuousCollector.start(sessionId, {
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

  const handleStepUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!secretPin || secretPin.length < 4) {
      setStepUpError('Please enter your 4 to 8 digit Secret PIN.')
      return
    }

    setStepUpLoading(true)
    setStepUpError(null)

    try {
      const activeSessionId = sessionId || 1
      const res = await apiClient.submitStepUpVerification(activeSessionId, secretPin)
      if (res.data.success) {
        setStepUpSuccess(true)
        setTrustScore(res.data.trust_score || 85.0)
        setRiskScore(res.data.risk_score || 15.0)
        setTrustLevel('TRUSTED')
        setRiskLevel('LOW')
        setTimeout(() => {
          setStepUpOpen(false)
          setSecretPin('')
          setStepUpSuccess(false)
        }, 1200)
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Incorrect Secret PIN. Please try again.'
      setStepUpError(msg)
    } finally {
      setStepUpLoading(false)
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
        triggerManualCheck,
      }}
    >
      {children}

      {/* Interactive Step-Up Challenge Modal */}
      {stepUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-slate-900 p-6 shadow-2xl shadow-amber-500/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
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
                      value={secretPin}
                      onChange={(e) => setSecretPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="input text-center text-xl tracking-[0.3em]"
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
                    disabled={stepUpLoading || !secretPin}
                    className="btn btn-primary w-full justify-center"
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
