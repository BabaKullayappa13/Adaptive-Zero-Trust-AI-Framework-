'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'
import { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'
import { Eye } from 'lucide-react'

type Policy = {
  id: number
  name: string
  description?: string
  enabled?: boolean
  rules?: unknown[]
  rule_count?: number
}

export default function PoliciesPage() {
  const router = useRouter()
  const { user, accessToken, isInitialized, logout, loadUser } = useAuthStore()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    if (isInitialized && (!user || !accessToken)) router.push('/auth/login')
  }, [user, accessToken, isInitialized, router])

  useEffect(() => {
    if (!user || !accessToken) return
    let active = true
    setLoading(true)
    apiClient.getActivePolicies()
      .then((response) => {
        if (!active) return
        const data = response.data
        setPolicies(Array.isArray(data) ? data : data?.policies ?? [])
        setError(null)
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || 'Unable to load policies.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [user, accessToken])

  if (!isInitialized || !user || !accessToken) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={logout} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Zero Trust Policies</h1>
            <p className="text-muted-foreground">Active policies returned by the protected policy service.</p>
          </div>

          {loading && <p className="text-muted-foreground" role="status">Loading policies...</p>}
          {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive" role="alert">{error}</p>}
          {!loading && !error && policies.length === 0 && <p className="text-muted-foreground">No active policies available.</p>}

          {!loading && !error && policies.length > 0 && (
            <div className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="card border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground">{policy.name}</h2>
                        <span className="rounded-full bg-success/20 px-2 py-1 text-xs font-medium text-success">Active</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{policy.description || 'No description provided.'}</p>
                      <p className="text-xs text-muted-foreground">{policy.rule_count ?? policy.rules?.length ?? 0} security rules</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`View ${policy.name}`}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      onClick={() => router.push(`/policies/${policy.id}`)}
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
