'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { apiClient } from '@/lib/api'

export default function FederatedLearningPage() {
  const [rounds, setRounds] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [roundsRes, modelsRes] = await Promise.all([
        apiClient.get('/admin/federated/rounds/history?limit=10'),
        apiClient.get('/admin/federated/models?limit=10')
      ])
      setRounds(roundsRes.data)
      setModels(modelsRes.data)
      if (roundsRes.data.length > 0) {
        setCurrentRound(roundsRes.data[0])
      }
    } catch (error) {
      console.error('[v0] Failed to fetch federated data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRound = async () => {
    try {
      const response = await apiClient.post('/api/federated/rounds', {})
      setRounds([response.data, ...rounds])
      setCurrentRound(response.data)
    } catch (error) {
      console.error('[v0] Failed to create round:', error)
    }
  }

  const handleAggregateModels = async () => {
    if (!currentRound) return
    try {
      const response = await apiClient.post(`/api/federated/rounds/${currentRound.round_id}/aggregate`, {})
      fetchData()
    } catch (error) {
      console.error('[v0] Failed to aggregate:', error)
    }
  }

  const accuracyTrend = models.map((m, i) => ({
    round: i + 1,
    accuracy: m.global_accuracy ? (m.global_accuracy * 100).toFixed(1) : 0,
    loss: m.global_loss ? (m.global_loss * 100).toFixed(1) : 0
  }))

  return (
    <main className="flex-1 bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Federated Learning</h1>
          <p className="text-gray-600">Distributed model training across multiple organizations</p>
        </div>

        {/* Current Round Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Round</h2>
          {currentRound ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Round Number</p>
                <p className="text-2xl font-bold text-gray-900">{currentRound.round_number}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="text-lg font-semibold text-blue-600 uppercase">{currentRound.status}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Model Version</p>
                <p className="text-sm font-mono text-gray-900">{currentRound.model_version}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Target Accuracy</p>
                <p className="text-xl font-bold text-gray-900">{(currentRound.target_accuracy * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Participants</p>
                <p className="text-2xl font-bold text-gray-900">{currentRound.total_participants || 0}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 mb-6">No active round</p>
          )}
          <div className="flex gap-4">
            <button
              onClick={handleCreateRound}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create New Round
            </button>
            <button
              onClick={handleAggregateModels}
              disabled={!currentRound || currentRound.status === 'completed'}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
            >
              Aggregate Models
            </button>
          </div>
        </div>

        {/* Model Performance Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Global Accuracy Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" name="Global Accuracy (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Model Loss Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Global Loss Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="loss" stroke="#ef4444" name="Global Loss (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Rounds */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Rounds</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Round</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Model Version</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => (
                  <tr key={round.round_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">#{round.round_number}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        round.status === 'completed' ? 'bg-green-100 text-green-800' :
                        round.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {round.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600">{round.model_version}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(round.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
