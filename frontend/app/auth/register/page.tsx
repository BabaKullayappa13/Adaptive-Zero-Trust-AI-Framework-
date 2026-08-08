'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMessage('')

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }

    try {
      await register(email, password)
      setSuccessMessage('Account created successfully! Please sign in to continue.')
      window.setTimeout(() => router.replace('/auth/login'), 1200)
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      setLocalError(
        status === 409 || (typeof detail === 'string' && detail.toLowerCase().includes('already'))
          ? 'An account with this email already exists.'
          : status >= 500
            ? 'Unable to create your account right now. Please try again later.'
            : detail || (err?.request ? 'Unable to connect to the server. Please try again.' : 'Registration failed'),
      )
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-primary">
            🔐 Zero Trust AI
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
            <p className="text-slate-400">Join Zero Trust AI Framework</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                disabled={isLoading}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-slate-500">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                disabled={isLoading}
                required
              />
            </div>

            {/* Error Message */}
            {(localError || error) && (
              <div role="alert" className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
                {localError || error}
              </div>
            )}
            {successMessage && (
              <div role="status" className="rounded-lg border border-emerald-700 bg-emerald-900/20 p-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 font-semibold"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-slate-400">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            href="/auth/login"
            className="w-full btn btn-secondary py-3 font-semibold text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
