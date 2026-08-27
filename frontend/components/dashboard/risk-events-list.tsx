'use client'

import { AlertCircle, TrendingUp } from 'lucide-react'

interface RiskEvent {
  id: string
  event_type: string
  risk_level: string
  risk_score: number
  explanation: {
    anomaly_score: number
    risk_factors: Record<string, any>
    shap_values?: {
      feature_importance: Record<string, number>
    }
  }
  created_at: string
}

interface RiskEventsListProps {
  events: RiskEvent[]
}

export default function RiskEventsList({ events }: RiskEventsListProps) {
  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'badge-low'
      case 'MEDIUM':
        return 'badge-medium'
      case 'HIGH':
        return 'badge-high'
      default:
        return 'badge'
    }
  }

  const getRiskIcon = (level: string) => {
    const color =
      level === 'HIGH' ? 'text-danger' : level === 'MEDIUM' ? 'text-warning' : 'text-success'
    return <TrendingUp size={18} className={color} />
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle size={24} className="text-primary" />
        <h2 className="text-xl font-bold text-foreground">Recent Risk Events</h2>
      </div>

      {events.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No recent risk events detected</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getRiskIcon(event.risk_level)}
                  <div>
                    <h3 className="font-semibold text-foreground">{event.event_type}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`badge ${getRiskBadgeClass(event.risk_level)}`}>{event.risk_level}</span>
              </div>

              {/* Risk Score */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Risk Score</span>
                  <span className="font-semibold text-foreground">{event.risk_score.toFixed(1)}/100</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      event.risk_level === 'HIGH'
                        ? 'bg-danger'
                        : event.risk_level === 'MEDIUM'
                          ? 'bg-warning'
                          : 'bg-success'
                    }`}
                    style={{ width: `${event.risk_score}%` }}
                  ></div>
                </div>
              </div>

              {/* Risk Factors */}
              {event.explanation?.risk_factors && (
                <div className="bg-slate-800/30 rounded p-3 text-xs space-y-1">
                  <p className="text-slate-300 font-semibold mb-2">Risk Factors:</p>
                  <ul className="space-y-1">
                    {Object.entries(event.explanation.risk_factors).map(([factor, detected]) => (
                      <li key={factor} className={detected ? 'text-warning' : 'text-success'}>
                        {detected ? '⚠️' : '✓'} {factor.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SHAP Feature Importance */}
              {event.explanation?.shap_values?.feature_importance && (
                <div className="mt-3 text-xs">
                  <p className="text-slate-300 font-semibold mb-2">Top Risk Factors (by importance):</p>
                  <div className="space-y-1">
                    {Object.entries(event.explanation.shap_values.feature_importance)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 3)
                      .map(([feature, importance]) => (
                        <div key={feature} className="flex justify-between text-slate-400">
                          <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                          <span className="font-semibold">{((importance as number) * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
