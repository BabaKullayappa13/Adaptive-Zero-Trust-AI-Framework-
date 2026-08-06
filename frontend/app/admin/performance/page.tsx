'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { apiClient } from '@/lib/api'

export default function AdminPerformancePage() {
  const [hours, setHours] = useState('24')
  const [metricsSummary, setMetricsSummary] = useState<any>(null)
  const [authStats, setAuthStats] = useState<any>(null)
  const [timeseriesData, setTimeseriesData] = useState<any[]>([])
  const [rps, setRps] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState('http_request')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const hoursNum = parseInt(hours)
        
        const [summary, auth, ts, rpsData] = await Promise.all([
          apiClient.getMetricsSummary(hoursNum),
          apiClient.getAuthStats(hoursNum),
          apiClient.getTimeseriesData(selectedMetric, hoursNum),
          apiClient.getRPS(Math.min(hoursNum, 1)),
        ])

        setMetricsSummary(summary.data)
        setAuthStats(auth.data)
        setTimeseriesData(ts.data || [])
        setRps(rpsData.data)
      } catch (error) {
        console.error('[v0] Failed to fetch metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [hours, selectedMetric])

  const handleExportCSV = async () => {
    try {
      const response = await apiClient.exportMetricsCSV(selectedMetric, parseInt(hours))
      const csv = response.data.csv
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.data.filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[v0] Failed to export CSV:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading performance metrics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Performance Monitoring</h1>
          <p className="text-muted-foreground">Real-time system performance and authentication metrics</p>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
            <select value={hours} onChange={(e) => setHours(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
              <option value="1">Last 1 Hour</option>
              <option value="6">Last 6 Hours</option>
              <option value="24">Last 24 Hours</option>
              <option value="168">Last 7 Days</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Metric Type</label>
            <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
              <option value="http_request">HTTP Requests</option>
              <option value="login">Login</option>
              <option value="api_call">API Calls</option>
              <option value="otp">OTP Verification</option>
              <option value="database_query">Database Queries</option>
            </select>
          </div>

          <div className="flex items-end">
            <button onClick={handleExportCSV} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:bg-gray-50 font-medium">
              Export CSV
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">Requests/Second</p>
                <p className="text-3xl font-bold text-gray-900">{rps?.rps?.toFixed(2) || '0'}</p>
                <p className="text-xs text-gray-500 mt-1">{rps?.total_requests || 0} total requests</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metricsSummary?.[selectedMetric]?.avg?.toFixed(2) || '0'}ms
                </p>
                <p className="text-xs text-gray-500 mt-1">All requests</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">P95 Response Time</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metricsSummary?.[selectedMetric]?.p95?.toFixed(2) || '0'}ms
                </p>
                <p className="text-xs text-gray-500 mt-1">95th percentile</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">Request Count</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metricsSummary?.[selectedMetric]?.count || '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">In period</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Response Time Distribution</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Minimum</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metricsSummary?.[selectedMetric]?.min?.toFixed(2) || '0'}ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Maximum</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metricsSummary?.[selectedMetric]?.max?.toFixed(2) || '0'}ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">P99</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metricsSummary?.[selectedMetric]?.p99?.toFixed(2) || '0'}ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metricsSummary?.[selectedMetric]?.avg?.toFixed(2) || '0'}ms
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Response Times by Type</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(metricsSummary || {}).map(([type, data]: any) => ({
                  name: type,
                  avg: data.avg,
                  min: data.min,
                  max: data.max,
                  p95: data.p95,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg" fill="#3b82f6" name="Average" />
                  <Bar dataKey="p95" fill="#f97316" name="P95" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Authentication Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(authStats || {}).map(([eventType, stats]: any) => (
                <div key={eventType} className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{eventType}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-lg font-semibold text-green-600">{stats.success_rate?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Successful</p>
                      <p className="text-lg font-semibold text-gray-900">{stats.success}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-lg font-semibold text-red-600">{stats.failed}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Avg Duration</p>
                      <p className="text-lg font-semibold text-gray-900">{stats.avg_duration_ms?.toFixed(2) || 0}ms</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Trends</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeseriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="avg" fill="#3b82f6" stroke="#3b82f6" name="Average Response Time (ms)" />
                  <Area type="monotone" dataKey="max" fill="#ef4444" stroke="#ef4444" name="Max Response Time (ms)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Volume</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeseriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#10b981" name="Request Count" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
