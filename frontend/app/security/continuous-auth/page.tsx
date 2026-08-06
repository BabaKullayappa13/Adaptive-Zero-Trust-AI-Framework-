'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api'

interface TrustScore {
  score: number
  timestamp: string
}

interface RiskScore {
  score: number
  level: string
  timestamp: string
}

interface Session {
  session_id: number
  device_id: number
  trust_score: number
  risk_score: number
  created_at: string
  last_activity: string
  is_active: boolean
}

interface Device {
  id: number
  fingerprint: string
  browser: string
  os: string
  is_trusted: boolean
  trust_score: number
  last_seen: string
}

export default function ContinuousAuthDashboard() {
  const [trustScoreHistory, setTrustScoreHistory] = useState<TrustScore[]>([])
  const [riskScoreHistory, setRiskScoreHistory] = useState<RiskScore[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [currentTrustScore, setCurrentTrustScore] = useState(0)
  const [currentRiskScore, setCurrentRiskScore] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get trust and risk score history
      const scoresRes = await apiClient.get('/api/auth/continuous/scores/history')
      if (scoresRes.data) {
        setTrustScoreHistory(scoresRes.data.trust_scores || [])
        setRiskScoreHistory(scoresRes.data.risk_scores || [])

        // Get latest scores
        if (scoresRes.data.trust_scores.length > 0) {
          setCurrentTrustScore(scoresRes.data.trust_scores[0].score)
        }
        if (scoresRes.data.risk_scores.length > 0) {
          setCurrentRiskScore(scoresRes.data.risk_scores[0].score)
        }
      }

      // Get active sessions
      const sessionsRes = await apiClient.get('/api/auth/continuous/sessions')
      if (sessionsRes.data) {
        setSessions(sessionsRes.data.sessions || [])
      }

      // Get trusted devices
      const devicesRes = await apiClient.get('/api/auth/devices')
      if (devicesRes.data) {
        setDevices(devicesRes.data.devices || [])
      }

      setLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Low':
        return 'bg-green-100 text-green-800'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'High':
        return 'bg-orange-100 text-orange-800'
      case 'Critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrustLevelText = (score: number) => {
    if (score > 80) return 'Very High'
    if (score > 60) return 'High'
    if (score > 40) return 'Medium'
    return 'Low'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Continuous Authentication Dashboard</h1>
          <p className="text-muted-foreground">Real-time security monitoring and trust analysis</p>
        </div>

        {/* Trust & Risk Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current Trust Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{currentTrustScore.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-2">{getTrustLevelText(currentTrustScore)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-600">{currentRiskScore.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentRiskScore > 75 ? 'Critical' : currentRiskScore > 50 ? 'High' : 'Medium'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{sessions.filter(s => s.is_active).length}</div>
              <p className="text-xs text-muted-foreground mt-2">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Trusted Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600">{devices.filter(d => d.is_trusted).length}</div>
              <p className="text-xs text-muted-foreground mt-2">of {devices.length} devices</p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Score Trend */}
        {trustScoreHistory.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Trust Score Trend</CardTitle>
              <CardDescription>Historical trust score over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trustScoreHistory}>
                  <defs>
                    <linearGradient id="colorTrust" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 100]} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrust)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Risk Score Trend */}
        {riskScoreHistory.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Risk Score Trend</CardTitle>
              <CardDescription>Historical risk score and level over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={riskScoreHistory}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 100]} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Active Sessions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Current and recent login sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground">No active sessions</p>
            ) : (
              <div className="space-y-4">
                {sessions.map(session => (
                  <div key={session.session_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Session #{session.session_id}</p>
                      <p className="text-sm text-muted-foreground">Started: {new Date(session.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Trust Score</p>
                        <p className="text-lg font-bold text-blue-600">{session.trust_score.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <p className="text-lg font-bold text-red-600">{session.risk_score.toFixed(0)}</p>
                      </div>
                      {session.is_active && <Badge className="bg-green-600">Active</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trusted Devices */}
        <Card>
          <CardHeader>
            <CardTitle>Trusted Devices</CardTitle>
            <CardDescription>Devices registered for this account</CardDescription>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-muted-foreground">No devices registered</p>
            ) : (
              <div className="space-y-4">
                {devices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{device.browser} on {device.os}</p>
                      <p className="text-sm text-muted-foreground">Last seen: {new Date(device.last_seen).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Trust Score</p>
                        <p className="text-lg font-bold">{device.trust_score.toFixed(0)}</p>
                      </div>
                      {device.is_trusted && <Badge className="bg-green-600">Trusted</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
