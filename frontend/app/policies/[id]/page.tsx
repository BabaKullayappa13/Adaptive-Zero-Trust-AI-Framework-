'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export default function PolicyDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, accessToken, isInitialized, logout, loadUser } = useAuthStore()
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void loadUser() }, [loadUser])
  useEffect(() => {
    if (isInitialized && (!user || !accessToken)) router.push('/auth/login')
  }, [isInitialized, user, accessToken, router])
  useEffect(() => {
    if (!user || !accessToken || !params.id) return
    apiClient.getPolicyDetails(Number(params.id))
      .then((response) => setPolicy(response.data))
      .catch((requestError) => setError(requestError.response?.data?.detail || 'Unable to load policy.'))
  }, [user, accessToken, params.id])

  if (!isInitialized || !user || !accessToken) return null
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={logout} />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => router.push('/policies')}>Back to policies</button>
        <h1 className="text-3xl font-bold text-foreground">Policy details</h1>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {policy && <pre className="overflow-auto rounded-lg border border-border bg-muted p-4 text-sm text-foreground">{JSON.stringify(policy, null, 2)}</pre>}
        {!policy && !error && <p role="status" className="text-muted-foreground">Loading policy...</p>}
      </main>
    </div>
  )
}
