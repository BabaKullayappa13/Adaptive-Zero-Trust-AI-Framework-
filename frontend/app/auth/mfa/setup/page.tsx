'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { Copy, Check } from 'lucide-react'

export default function MFASetupPage() {
  const router = useRouter()
  const { user, setupMFA: setupMFAStore, isLoading } = useAuthStore()
  const [step, setStep] = useState<'generate' | 'verify' | 'complete'>('generate')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [manualKey, setManualKey] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
    }
  }, [user, router])

  const handleGenerateMFA = async () => {
    try {
      setError(null)
      const result = await setupMFAStore(user!.id)
      setQrCode(result.qr_code_url)
      setManualKey(result.manual_entry_key)
      setStep('verify')
    } catch (err: any) {
      setError(err.message || 'Failed to generate MFA')
    }
  }

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!totpCode || totpCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    try {
      await useAuthStore.getState().verifyMFA(user!.id, totpCode)
      setStep('complete')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
    }
  }

  const copyToClipboard = () => {
    if (manualKey) {
      navigator.clipboard.writeText(manualKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard" className="text-2xl font-bold text-primary">
            🔐 Zero Trust AI
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Enable Two-Factor Authentication</h1>
            <p className="text-slate-400">Secure your account with MFA</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'generate' || step === 'verify' || step === 'complete' ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>
              1
            </div>
            <div className="flex-1 h-1 mx-2 bg-slate-700"></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'verify' || step === 'complete' ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>
              2
            </div>
            <div className="flex-1 h-1 mx-2 bg-slate-700"></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'complete' ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>
              3
            </div>
          </div>

          {/* Step 1: Generate */}
          {step === 'generate' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Step 1: Download an Authenticator App</h3>
                <p className="text-sm text-slate-400">
                  Use Google Authenticator, Microsoft Authenticator, Authy, or any compatible TOTP app.
                </p>
                <ul className="text-sm text-slate-400 space-y-2 ml-4">
                  <li>• Google Authenticator (iOS/Android)</li>
                  <li>• Microsoft Authenticator (iOS/Android)</li>
                  <li>• Authy (iOS/Android)</li>
                  <li>• 1Password (iOS/Android)</li>
                </ul>
              </div>

              <button
                onClick={handleGenerateMFA}
                disabled={isLoading}
                className="w-full btn btn-primary py-3 font-semibold"
              >
                {isLoading ? 'Generating...' : 'Generate QR Code'}
              </button>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Step 2: Scan QR Code</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Scan this QR code with your authenticator app:
                </p>

                {qrCode && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg">
                      <Image
                        src={qrCode}
                        alt="MFA QR Code"
                        width={192}
                        height={192}
                        unoptimized
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-400 mb-2">Can&apos;t scan the QR code?</p>
                  <p className="text-sm text-slate-300 font-mono break-all bg-slate-900/50 p-3 rounded border border-slate-700 flex items-center justify-between">
                    {manualKey}
                    <button
                      onClick={copyToClipboard}
                      className="ml-2 p-1 hover:bg-slate-700 rounded transition"
                    >
                      {copied ? (
                        <Check size={18} className="text-success" />
                      ) : (
                        <Copy size={18} className="text-slate-400" />
                      )}
                    </button>
                  </p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-200">
                  Save your recovery codes in a safe place. You&apos;ll need them if you lose access to your authenticator app.
                </p>
              </div>
            </div>
          )}

          {/* Step 2.5: Enter TOTP */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyMFA} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Enter 6-Digit Code from Your App
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="input text-center text-2xl tracking-widest"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="w-full btn btn-primary py-3 font-semibold"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <div className="space-y-6">
              <div className="bg-success/20 border border-success rounded-lg p-6 text-center space-y-4">
                <div className="text-5xl">✓</div>
                <h3 className="text-lg font-semibold text-success">MFA Enabled Successfully!</h3>
                <p className="text-sm text-slate-300">
                  Your account is now protected with two-factor authentication.
                </p>
              </div>

              <p className="text-center text-sm text-slate-400">
                Redirecting to dashboard in a moment...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
