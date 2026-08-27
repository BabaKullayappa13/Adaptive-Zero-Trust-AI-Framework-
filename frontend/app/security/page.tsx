'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'
import { 
  Shield, Lock, KeyRound, Smartphone, Mail, Sparkles, 
  CheckCircle2, RefreshCw, Eye, EyeOff, ShieldAlert, Cpu 
} from 'lucide-react'

export default function SecurityPage() {
  const router = useRouter()
  const { user, accessToken, isInitialized, loadUser, logout, changeSecurePin, getMfaFactors } = useAuthStore()

  // Change PIN modal state
  const [showModal, setShowModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')
  const [mfaData, setMfaData] = useState<any>(null)

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    if (isInitialized && (!user || !accessToken)) {
      router.replace('/auth/login')
    } else if (accessToken) {
      void getMfaFactors().then(data => {
        if (data) setMfaData(data)
      })
    }
  }, [isInitialized, user, accessToken, router, getMfaFactors])

  if (!isInitialized) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Verifying secure session...</div>
  if (!user || !accessToken) return null

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalSuccess('')

    if (!currentPassword || !newPin || !confirmNewPin) {
      setModalError('Please fill in all fields.')
      return
    }

    if (newPin.length < 4 || newPin.length > 8) {
      setModalError('New PIN must be between 4 and 8 numeric digits.')
      return
    }

    if (newPin !== confirmNewPin) {
      setModalError('New PINs do not match.')
      return
    }

    setModalLoading(true)
    try {
      await changeSecurePin(currentPassword, newPin, confirmNewPin)
      setModalSuccess('Secure PIN changed successfully!')
      setTimeout(() => {
        setShowModal(false)
        setCurrentPassword('')
        setNewPin('')
        setConfirmNewPin('')
        setModalSuccess('')
        void getMfaFactors().then(data => setMfaData(data))
      }, 1500)
    } catch (err: any) {
      setModalError(err.message || 'Failed to update Secure PIN.')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={logout} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Multi-Factor Security Governance</h1>
            <p className="text-slate-400">Manage your Zero Trust authentication factors, permanent Secure PIN, and continuous telemetry</p>
          </div>

          {/* MFA Factors Status Banner */}
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Shield className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">5-Stage Zero Trust MFA Active</h2>
                <p className="text-xs text-slate-400">Software-only protection enforced across email, password, CAPTCHA, OTP, and Secure PIN</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              Continuous Telemetry Enforced
            </span>
          </div>

          {/* Security Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Factor 1: Email Verified */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Mail size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 size={14} /> Verified
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Email Identity</h3>
                <p className="text-xs text-slate-400 mt-1">{user.email}</p>
              </div>
              <div className="text-[11px] text-slate-500">Channel verification active for alerts & OTP dispatch.</div>
            </div>

            {/* Factor 2: Password */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Lock size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 size={14} /> Protected
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Password Factor</h3>
                <p className="text-xs text-slate-400 mt-1">Bcrypt Salted & Hashed</p>
              </div>
              <div className="text-[11px] text-slate-500">Primary credential factor for initial sign-in.</div>
            </div>

            {/* Factor 3: CAPTCHA */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 size={14} /> Automated
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Adaptive CAPTCHA</h3>
                <p className="text-xs text-slate-400 mt-1">Anti-Bot Mathematical Challenge</p>
              </div>
              <div className="text-[11px] text-slate-500">Dynamic challenge issued on each login attempt.</div>
            </div>

            {/* Factor 4: OTP */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Smartphone size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 size={14} /> Enabled
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">One-Time Password (OTP)</h3>
                <p className="text-xs text-slate-400 mt-1">6-Digit Ephemeral Token</p>
              </div>
              <div className="text-[11px] text-slate-500">Dispatched with 5-minute cryptographic expiry.</div>
            </div>

            {/* Factor 5: Permanent Secure PIN */}
            <div className="card space-y-4 border-cyan-400/30 bg-cyan-950/10">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-cyan-400/20 flex items-center justify-center text-cyan-300">
                  <KeyRound size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300">
                  <CheckCircle2 size={14} /> Configured
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Permanent Secure PIN</h3>
                <p className="text-xs text-slate-400 mt-1">Configured Once ? Stored Permanently</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(true)}
                className="w-full rounded-xl bg-cyan-400/10 border border-cyan-400/30 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20 transition"
              >
                Change Secure PIN
              </button>
            </div>

            {/* Factor 6: Zero Trust AI Monitoring */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Cpu size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 size={14} /> Active
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">AI Behavioral Engine</h3>
                <p className="text-xs text-slate-400 mt-1">Isolation Forest Anomaly Scoring</p>
              </div>
              <button 
                type="button" 
                onClick={() => router.push('/security/continuous-auth')}
                className="w-full rounded-xl bg-white/5 border border-white/10 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                View Telemetry Monitor
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Change Secure PIN Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <KeyRound className="size-5 text-cyan-300" />
                Change 6-Digit Secure PIN
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ?
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Current Account Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="????????????"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    New 6-Digit Secure PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-1 text-[11px] text-cyan-300"
                  >
                    {showPin ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showPin ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="??????"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-center text-lg font-mono text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm New Secure PIN
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={8}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="??????"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-center text-lg font-mono text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !currentPassword || !newPin || newPin !== confirmNewPin}
                  className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  {modalLoading ? <RefreshCw className="size-3.5 animate-spin" /> : null}
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
