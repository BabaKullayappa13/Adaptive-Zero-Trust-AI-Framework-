'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmation) return setError('Passwords do not match.')
    setIsLoading(true)
    try {
      await apiClient.resetPassword(email, token, password)
      router.replace('/auth/login?reset=success')
    } catch (requestError: any) {
      const detail = requestError?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Unable to reset your password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <section className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2"><h1 className="text-3xl font-bold text-foreground">Reset Password</h1><p className="text-slate-400">Use the token from your reset email.</p></div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input aria-label="Email Address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="Email Address" required disabled={isLoading} />
          <input aria-label="Reset token" value={token} onChange={(event) => setToken(event.target.value)} className="input" placeholder="Reset token" required disabled={isLoading} />
          <input aria-label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" placeholder="New password" required disabled={isLoading} />
          <input aria-label="Confirm new password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input" placeholder="Confirm new password" required disabled={isLoading} />
          {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-900/20 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full btn btn-primary py-3 font-semibold">{isLoading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
        <Link href="/auth/login" className="block text-center text-primary hover:underline">Return to Sign In</Link>
      </section>
    </main>
  )
}
