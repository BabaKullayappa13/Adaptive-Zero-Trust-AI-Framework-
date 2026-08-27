'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowRight, BookOpen, FileText, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import Navbar from '@/components/navbar'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

const fetchReports = () => apiClient.getReports().then((response: any) => response.data)
const fetchSchedules = () => apiClient.getReportSchedules().then((response: any) => response.data)
const fetchDocs = () => apiClient.getOpenApiSpec().then((response: any) => response.data)

const sampleFeatures = [
  { name: 'Device trust', value: 0.91, impact: 0.34, direction: 'positive' },
  { name: 'Behavioral consistency', value: 0.74, impact: 0.21, direction: 'positive' },
  { name: 'Location variance', value: 0.38, impact: -0.18, direction: 'negative' },
  { name: 'Authentication strength', value: 0.86, impact: 0.12, direction: 'positive' },
]

export default function Phase4Page() {
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'explain' | 'reports' | 'docs'>('explain')
  const [decision, setDecision] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const { data: reports, mutate: refreshReports } = useSWR('phase4-reports', fetchReports)
  const { data: schedules } = useSWR('phase4-schedules', fetchSchedules)
  const { data: docs } = useSWR('phase4-openapi', fetchDocs)

  const generateExplanation = async () => {
    setGenerating(true)
    try {
      const response = await apiClient.explainDecision({
        user_id: user?.id ?? 'current-user',
        decision: 'challenge',
        trust_score: 68.0,
        risk_score: 32.0,
        features: {
          location_variance: true,
          device_trust: 85.0,
          mfa_enabled: true
        }
      })
      setDecision(response.data)
    } catch {
      setDecision({ error: 'Explainability service is unavailable.' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Advanced Operations & Analytics</h1>
        <div className="flex gap-4 border-b border-border pb-4">
          <button
            onClick={() => setActiveTab('explain')}
            className={`px-4 py-2 rounded font-semibold ${activeTab === 'explain' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Explainable AI
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded font-semibold ${activeTab === 'reports' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded font-semibold ${activeTab === 'docs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            API Documentation
          </button>
        </div>

        {activeTab === 'explain' && (
          <div className="space-y-6">
            <button onClick={generateExplanation} disabled={generating} className="btn btn-primary">
              {generating ? 'Generating Explanation...' : 'Generate Decision Explanation'}
            </button>
            {decision && (
              <pre className="p-4 bg-muted rounded border border-border overflow-auto text-xs">
                {JSON.stringify(decision, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-6 bg-card border border-border rounded-xl">
            <h2 className="text-xl font-bold mb-4">Research & Telemetry Reports</h2>
            <pre className="p-4 bg-muted rounded border border-border overflow-auto text-xs">
              {JSON.stringify(reports, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="p-6 bg-card border border-border rounded-xl">
            <h2 className="text-xl font-bold mb-4">FastAPI OpenAPI Specification</h2>
            <pre className="p-4 bg-muted rounded border border-border overflow-auto text-xs max-h-96">
              {JSON.stringify(docs, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
