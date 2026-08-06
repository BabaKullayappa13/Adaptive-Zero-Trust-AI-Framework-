'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { apiClient } from '@/lib/api'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

export default function ResearchDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [complianceScore, setComplianceScore] = useState<any>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [days])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [dashRes, compRes] = await Promise.all([
        apiClient.get(`/research/dashboard/summary?days=${days}`),
        apiClient.get('/research/compliance-score')
      ])
      setDashboardData(dashRes.data)
      setComplianceScore(compRes.data)
    } catch (error) {
      console.error('[v0] Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!dashboardData) {
    return <main className="flex-1 bg-gray-50 p-8"><div className="text-center text-gray-500">Loading...</div></main>
  }

  const authTrends = dashboardData.authentication_trends?.trends || []
  const threatData = dashboardData.threat_analytics || {}
  const userBehavior = dashboardData.user_behavior || {}
  const deviceData = dashboardData.device_analytics || {}
  const riskDist = dashboardData.risk_distribution?.distribution || {}

  // Prepare data for charts
  const riskChartData = Object.entries(riskDist).map(([level, data]: any) => ({
    name: level,
    value: data.count || 0
  }))

  const deviceChartData = deviceData.by_device_type || []

  return (
    <main className="flex-1 bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Research Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive authentication and security analytics</p>
            </div>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Compliance Score */}
        {complianceScore && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-8 mb-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-blue-100 text-sm">IEEE Compliance Score</p>
                <p className="text-5xl font-bold">{complianceScore.compliance_percentage}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Status</p>
                <p className="text-xl font-semibold capitalize">{complianceScore.status}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Metrics Evaluated</p>
                <p className="text-2xl font-bold">{complianceScore.metrics_evaluated}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Recommendation</p>
                <p className="text-sm">{complianceScore.recommendation}</p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Unique Users</p>
            <p className="text-3xl font-bold text-gray-900">{userBehavior.unique_users || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total Threats Detected</p>
            <p className="text-3xl font-bold text-red-600">{threatData.total_threats || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Threats Mitigated</p>
            <p className="text-3xl font-bold text-green-600">{threatData.threats_mitigated || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Devices Tracked</p>
            <p className="text-3xl font-bold text-blue-600">{deviceData.total_devices || 0}</p>
          </div>
        </div>

        {/* Authentication Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Authentication Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={authTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total_attempts" stroke="#3b82f6" name="Total Attempts" />
              <Line type="monotone" dataKey="successful_auths" stroke="#10b981" name="Successful" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Risk Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Threat Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Threat Breakdown</h2>
            <div className="space-y-4">
              {Object.entries(threatData.by_severity || {}).map(([severity, count]: any) => (
                <div key={severity} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium text-gray-900 capitalize">{severity}</span>
                  <span className={`text-lg font-bold ${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device Analytics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Device Analytics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="device_type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Count" />
              <Bar dataKey="avg_trust_score" fill="#10b981" name="Avg Trust Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}
