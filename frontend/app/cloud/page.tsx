'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

export default function HybridCloudPage() {
  const [topology, setTopology] = useState<any>(null)
  const [clouds, setClouds] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCloud, setSelectedCloud] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [topoRes, cloudsRes] = await Promise.all([
        apiClient.get('/cloud/topology'),
        apiClient.get('/cloud/active')
      ])
      setTopology(topoRes.data)
      setClouds(cloudsRes.data)
      if (cloudsRes.data.length > 0) {
        await fetchCloudHealth(cloudsRes.data[0].cloud_id)
      }
    } catch (error) {
      console.error('[v0] Failed to fetch cloud data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCloudHealth = async (cloudId: number) => {
    try {
      const response = await apiClient.get(`/cloud/${cloudId}/health`)
      setSelectedCloud(response.data)
    } catch (error) {
      console.error('[v0] Failed to fetch cloud health:', error)
    }
  }

  return (
    <main className="flex-1 bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hybrid Cloud Topology</h1>
          <p className="text-gray-600">Multi-cloud architecture with automatic failover</p>
        </div>

        {/* Cloud Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total Clouds</p>
            <p className="text-3xl font-bold text-gray-900">{topology?.total_clouds || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Public Cloud</p>
            <p className="text-3xl font-bold text-blue-600">{topology?.topology?.public?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Private Cloud</p>
            <p className="text-3xl font-bold text-green-600">{topology?.topology?.private?.length || 0}</p>
          </div>
        </div>

        {/* Cloud Topology Visualization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Cloud Infrastructure</h2>
          <div className="space-y-6">
            {topology?.topology && Object.entries(topology.topology).map(([cloudType, cloudList]: any) => (
              <div key={cloudType}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">{cloudType} Cloud</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cloudList.map((cloud: any) => (
                    <div 
                      key={cloud.cloud_id}
                      onClick={() => fetchCloudHealth(cloud.cloud_id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        cloud.is_primary
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{cloud.name}</h4>
                          <p className="text-sm text-gray-600">{cloud.provider} - {cloud.region}</p>
                        </div>
                        {cloud.is_primary && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">PRIMARY</span>
                        )}
                      </div>
                      <p className={`text-sm font-medium ${
                        cloud.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Status: {cloud.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Cloud Details */}
        {selectedCloud && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedCloud.name} - Health Report</h2>
            
            {/* Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Latency</p>
                <p className="text-2xl font-bold text-gray-900">{selectedCloud.health?.latency_ms?.toFixed(1) || 'N/A'}ms</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Availability</p>
                <p className="text-2xl font-bold text-green-600">{selectedCloud.health?.availability_percent?.toFixed(1) || 'N/A'}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Throughput</p>
                <p className="text-2xl font-bold text-gray-900">{selectedCloud.health?.throughput_mbps?.toFixed(1) || 'N/A'} Mbps</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">{(selectedCloud.health?.error_rate * 100 || 0).toFixed(2)}%</p>
              </div>
            </div>

            {/* Recent Syncs */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Synchronizations</h3>
              <div className="space-y-2">
                {selectedCloud.recent_syncs?.map((sync: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{sync.sync_type}</p>
                      <p className="text-sm text-gray-600">{sync.records_synced} records in {sync.duration_ms?.toFixed(1)}ms</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      sync.status === 'success' ? 'bg-green-100 text-green-800' :
                      sync.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sync.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Clouds List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">All Cloud Configurations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Provider</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Region</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                </tr>
              </thead>
              <tbody>
                {clouds.map((cloud) => (
                  <tr key={cloud.cloud_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{cloud.name}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{cloud.cloud_type}</td>
                    <td className="py-3 px-4 text-gray-600">{cloud.provider}</td>
                    <td className="py-3 px-4 text-gray-600">{cloud.region}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        {cloud.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {cloud.is_primary ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          PRIMARY
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">BACKUP</span>
                      )}
                    </td>
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
