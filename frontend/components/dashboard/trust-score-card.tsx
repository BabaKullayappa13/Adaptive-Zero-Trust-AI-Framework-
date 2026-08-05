'use client'

import { Shield } from 'lucide-react'

interface TrustScoreCardProps {
  trustScore: {
    score: number
    risk_level: string
    factors: Record<string, number>
  }
}

export default function TrustScoreCard({ trustScore }: TrustScoreCardProps) {
  const score = trustScore.score
  const riskLevel = trustScore.risk_level

  // Determine color based on risk level
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'LOW':
        return 'text-success'
      case 'MEDIUM':
        return 'text-warning'
      case 'HIGH':
        return 'text-danger'
      default:
        return 'text-primary'
    }
  }

  const getRiskBg = () => {
    switch (riskLevel) {
      case 'LOW':
        return 'bg-success/10 border-success/30'
      case 'MEDIUM':
        return 'bg-warning/10 border-warning/30'
      case 'HIGH':
        return 'bg-danger/10 border-danger/30'
      default:
        return 'bg-primary/10 border-primary/30'
    }
  }

  return (
    <div className={`card border-2 ${getRiskBg()}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Score Visualization */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Circular Progress */}
            <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle cx="100" cy="100" r="90" fill="none" stroke="#334155" strokeWidth="8" />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke={riskLevel === 'LOW' ? '#10b981' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 565} 565`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            </svg>
            {/* Center text */}
            <div className="text-center z-10">
              <div className="text-5xl font-bold text-foreground">{score.toFixed(1)}</div>
              <div className={`text-sm font-semibold ${getRiskColor()}`}>{riskLevel}</div>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Trust Score</h3>
            <p className="text-slate-400">
              Your current security trust score based on behavioral analysis and risk assessment
            </p>
          </div>

          {/* Factor Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Risk Factors</h4>
            {Object.entries(trustScore.factors).map(([factor, value]) => (
              <div key={factor}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400 capitalize">{factor.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-foreground">{(value as number).toFixed(1)}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${(value as number)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield size={20} className="text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Recommendation</p>
                <p className="text-sm text-slate-400 mt-1">
                  {riskLevel === 'LOW'
                    ? 'Your account shows normal behavior patterns. Access is unrestricted.'
                    : riskLevel === 'MEDIUM'
                      ? 'Unusual activity detected. Consider enabling MFA for additional security.'
                      : 'High-risk activity detected. Please verify your identity before proceeding.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
