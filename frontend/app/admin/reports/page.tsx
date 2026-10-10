'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileDown,
  Clock,
  Calendar,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import AdminSessionGuard from '@/components/admin-session-guard'
import AdminSidebar from '@/components/admin/admin-sidebar'
import { apiClient } from '@/lib/api'

type PeriodType = 'hour' | 'day' | 'month' | 'custom'
type FormatType = 'csv' | 'json'

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<PeriodType>('day')
  const [format, setFormat] = useState<FormatType>('csv')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [userList, setUserList] = useState<any[]>([])
  const [previewRecords, setPreviewRecords] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load registered users for optional user filter
  useEffect(() => {
    apiClient.getAdminUsers()
      .then((res) => setUserList(res.data || []))
      .catch((e) => console.warn('Could not fetch user list:', e))
  }, [])

  // Load preview data in JSON whenever period or user changes
  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true)
    setErrorMsg(null)
    try {
      const res = await apiClient.downloadActivityStatement(
        period,
        'json',
        selectedUser || undefined,
        period === 'custom' ? startDate : undefined,
        period === 'custom' ? endDate : undefined
      )
      setPreviewRecords(res.data?.records || [])
    } catch (err: any) {
      console.warn('Failed to load statement preview:', err)
      setErrorMsg('Unable to retrieve statement preview from backend.')
    } finally {
      setPreviewLoading(false)
    }
  }, [period, selectedUser, startDate, endDate])

  useEffect(() => {
    void fetchPreview()
  }, [fetchPreview])

  // Download Statement File
  const handleDownload = async () => {
    setDownloading(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await apiClient.downloadActivityStatement(
        period,
        format,
        selectedUser || undefined,
        period === 'custom' ? startDate : undefined,
        period === 'custom' ? endDate : undefined
      )

      if (format === 'csv') {
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute(
          'download',
          `user_activity_statement_${period}_${new Date().toISOString().slice(0, 10)}.csv`
        )
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } else {
        const jsonStr = JSON.stringify(res.data, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute(
          'download',
          `user_activity_statement_${period}_${new Date().toISOString().slice(0, 10)}.json`
        )
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      }

      setSuccessMsg(`User activity statement (${period}) downloaded successfully.`)
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setErrorMsg('Failed to download activity statement. Check backend connection.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <AdminSessionGuard />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow text-cyan-400">Compliance & Telemetry Reports</p>
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                  <FileDown className="size-8 text-cyan-400" />
                  User Activity Statement & Reports
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Export authoritative user session logs, policy decisions, and security events across 1 Hour, 1 Day, or 1 Month intervals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="size-3.5" />
                  Formula Injection Sanitized
                </span>
              </div>
            </header>

            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="size-4" />
                {errorMsg}
              </div>
            )}

            {/* Statement Generation Configuration */}
            <section className="soc-panel p-6 space-y-6">
              <h2 className="text-base font-semibold text-white">Generate Statement</h2>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Time Range Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Statement Timeframe
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPeriod('hour')}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                        period === 'hour'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod('day')}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                        period === 'day'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod('month')}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                        period === 'month'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1 Month
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPeriod('custom')}
                    className={`mt-2 w-full py-1.5 text-[11px] font-semibold rounded-lg border text-center transition ${
                      period === 'custom'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900/50 border-white/5 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Custom Date Range
                  </button>

                  {period === 'custom' && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                        placeholder="Start Date"
                      />
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                        placeholder="End Date"
                      />
                    </div>
                  )}
                </div>

                {/* User Filter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Filter by User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">All Users (Entire Workspace)</option>
                    {userList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Filter statement to a specific user identity or export global tenant logs.
                  </p>
                </div>

                {/* Export Format & Action */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Format & Export
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setFormat('csv')}
                      className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                        format === 'csv'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileSpreadsheet className="size-3.5" /> CSV Format
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('json')}
                      className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                        format === 'json'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileCode className="size-3.5" /> JSON Format
                    </button>
                  </div>

                  <button
                    onClick={() => void handleDownload()}
                    disabled={downloading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-950/50 disabled:opacity-50"
                  >
                    <FileDown className={`size-4 ${downloading ? 'animate-bounce' : ''}`} />
                    {downloading ? 'Generating Statement...' : `Download ${period.toUpperCase()} Statement`}
                  </button>
                </div>
              </div>
            </section>

            {/* Statement Preview */}
            <section className="soc-panel overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Statement Preview</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Showing {previewRecords.length} recent activity records for period:{' '}
                    <strong className="text-cyan-300 uppercase">{period}</strong>
                  </p>
                </div>
                <button
                  onClick={() => void fetchPreview()}
                  disabled={previewLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-300 hover:text-white transition"
                >
                  <RefreshCw className={`size-3 ${previewLoading ? 'animate-spin' : ''}`} />
                  Refresh Preview
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[.02] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Timestamp</th>
                      <th className="px-5 py-3 font-semibold">User</th>
                      <th className="px-5 py-3 font-semibold">Action</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Risk Level</th>
                      <th className="px-5 py-3 font-semibold">IP Address</th>
                      <th className="px-5 py-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[.06]">
                    {previewRecords.length > 0 ? (
                      previewRecords.map((r, i) => (
                        <tr key={r.event_id || i} className="hover:bg-white/[.02]">
                          <td className="px-5 py-3 font-mono text-slate-400">
                            {r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-5 py-3 font-mono text-cyan-300">
                            {r.email || r.user_id || 'System'}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-200">
                            {r.action}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                r.status === 'SUCCESS'
                                  ? 'bg-emerald-400/10 text-emerald-300'
                                  : 'bg-rose-400/10 text-rose-300'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : r.risk_level === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {r.risk_level || 'LOW'}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-400">
                            {r.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-5 py-3 text-slate-400 truncate max-w-xs">
                            {typeof r.details === 'object' ? JSON.stringify(r.details) : String(r.details || '-')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                          {previewLoading ? 'Loading statement preview...' : 'No activity logs found for the selected timeframe.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  )
}
