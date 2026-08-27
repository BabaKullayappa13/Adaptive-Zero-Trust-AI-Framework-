'use client'

import { Clock } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  resource?: string
  result: string
  details?: Record<string, any>
  ip_address?: string
  created_at: string
}

interface AuditLogsTableProps {
  logs: AuditLog[]
}

export default function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const getResultColor = (result: string) => {
    return result === 'SUCCESS' ? 'text-success' : result === 'FAILURE' ? 'text-danger' : 'text-slate-400'
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <Clock size={24} className="text-primary" />
        <h2 className="text-xl font-bold text-foreground">Audit Logs</h2>
      </div>

      {logs.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No audit logs available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-slate-400">
                <th className="text-left py-3 px-0 font-semibold">Action</th>
                <th className="text-left py-3 px-0 font-semibold">Result</th>
                <th className="text-left py-3 px-0 font-semibold">IP Address</th>
                <th className="text-left py-3 px-0 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-0 text-foreground font-medium">{log.action}</td>
                  <td className={`py-3 px-0 font-medium ${getResultColor(log.result)}`}>{log.result}</td>
                  <td className="py-3 px-0 text-slate-400 font-mono text-xs">{log.ip_address || '—'}</td>
                  <td className="py-3 px-0 text-slate-400">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
