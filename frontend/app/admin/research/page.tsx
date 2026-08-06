'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

export default function ResearchReportPage() {
  const [hours, setHours] = useState('24')
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const response = await apiClient.getResearchReport(parseInt(hours))
        setReport(response.data.report)
      } catch (error) {
        console.error('[v0] Failed to fetch research report:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchReport()
  }, [hours])

  const handleCopyReport = () => {
    if (report) {
      navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadReport = () => {
    if (report) {
      const blob = new Blob([report], { type: 'text/markdown' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `research-report-${new Date().toISOString()}.md`
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Research Comparison Report</h1>
          <p className="text-muted-foreground">Performance analysis against IEEE paper baselines for continuous authentication and zero-trust frameworks</p>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Analysis Period</label>
            <select value={hours} onChange={(e) => setHours(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
              <option value="1">Last 1 Hour</option>
              <option value="6">Last 6 Hours</option>
              <option value="24">Last 24 Hours</option>
              <option value="168">Last 7 Days</option>
              <option value="720">Last 30 Days</option>
            </select>
          </div>

          <div className="flex gap-2 items-end">
            <button 
              onClick={handleCopyReport} 
              disabled={!report}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button 
              onClick={handleDownloadReport} 
              disabled={!report}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Download MD
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <p className="text-center text-gray-500">Generating research report...</p>
          </div>
        ) : report ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="whitespace-pre-wrap font-mono text-sm text-gray-900 bg-gray-50 p-6 rounded-lg overflow-x-auto max-h-[800px] overflow-y-auto border border-gray-200">
              {report}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <p className="text-center text-gray-500">No report available. Try a different time period.</p>
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">About This Report</h3>
          <p className="text-sm text-gray-600">
            This research comparison report analyzes your system&apos;s performance against established IEEE paper baselines for continuous authentication and zero-trust security frameworks. It includes detailed performance metrics, SLA compliance checks, and optimization recommendations based on industry standards and best practices.
          </p>
        </div>
      </div>
    </div>
  )
}
