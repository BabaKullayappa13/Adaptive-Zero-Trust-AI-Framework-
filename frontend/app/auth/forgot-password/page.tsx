'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { apiClient } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const response = await apiClient.forgotPassword(email)
      setMessage(response.data?.message ?? 'If the account exists, a reset link has been sent.')
    } catch (requestError: any) {
      const detail = requestError?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Unable to send the reset request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <section className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Forgot Password</h1>
          <p className="text-slate-400">Request a secure password reset link.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">Email Address</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" required disabled={isLoading} />
          </div>
          {message && <p role="status" className="rounded-lg border border-emerald-700 bg-emerald-900/20 p-3 text-sm text-emerald-200">{message}</p>}
          {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-900/20 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full btn btn-primary py-3 font-semibold">{isLoading ? 'Sending...' : 'Send Reset Link'}</button>
        </form>
        <Link href="/auth/login" className="block text-center text-primary hover:underline">Return to Sign In</Link>
      </section>
    </main>
  )
}
