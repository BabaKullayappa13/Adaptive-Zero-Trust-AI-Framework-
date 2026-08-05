'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api'
import TrustScoreCard from '@/components/dashboard/trust-score-card'
import RiskEventsList from '@/components/dashboard/risk-events-list'
import AuditLogsTable from '@/components/dashboard/audit-logs-table'
import Charts from '@/components/dashboard/charts'
import Navbar from '@/components/navbar'

export default function DashboardPage() {
  const router = useRouter()
  const { user, accessToken, logout } = useAuthStore()
  const [trustScore, setTrustScore] = useState<any>(null)
  const [riskEvents, setRiskEvents] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check authentication
  useEffect(() => {
    if (!user || !accessToken) {
      router.push('/auth/login')
    }
  }, [user, accessToken, router])

  // Load dashboard data
  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get trust score
        try {
          const scoreRes = await apiClient.getTrustScore(user.id)
          setTrustScore(scoreRes.data)
        } catch (err) {
          console.error('Failed to load trust score:', err)
        }

        // Detect risk
        try {
          const riskRes = await apiClient.detectRisk(user.id, {
            login_hour: new Date().getHours(),
            device_count: 1,
            failed_attempts: 0,
            session_duration: 10,
            geographic_distance: Math.random() * 50,
            device_trust: 0.85,
            velocity: Math.random() * 50,
            request_count: Math.floor(Math.random() * 200),
            new_device: false,
          })
          setRiskEvents([riskRes.data])
        } catch (err) {
          console.error('Failed to detect risk:', err)
        }

        // Get audit logs
        try {
          const logsRes = await apiClient.getAuditLogs(user.id)
          setAuditLogs(logsRes.data.logs || [])
        } catch (err) {
          console.error('Failed to load audit logs:', err)
        }
      } catch (err: any) {
        setError('Failed to load dashboard data')
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  if (!user || !accessToken) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={logout} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Page Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Security Dashboard</h1>
          <p className="text-slate-400">Real-time threat detection & continuous trust assessment</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card h-32 bg-slate-800 animate-pulse"></div>
            ))}
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && (
          <>
            {/* Trust Score Section */}
            {trustScore && <TrustScoreCard trustScore={trustScore} />}

            {/* Charts */}
            <Charts />

            {/* Risk Events & Audit Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RiskEventsList events={riskEvents} />
              <AuditLogsTable logs={auditLogs.slice(0, 5)} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
