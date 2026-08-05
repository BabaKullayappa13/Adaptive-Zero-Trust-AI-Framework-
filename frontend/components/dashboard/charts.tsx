'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const trustTrendData = [
  { time: '00:00', score: 75 },
  { time: '04:00', score: 78 },
  { time: '08:00', score: 82 },
  { time: '12:00', score: 85 },
  { time: '16:00', score: 88 },
  { time: '20:00', score: 86 },
  { time: '24:00', score: 84 },
]

const riskDistributionData = [
  { name: 'Low Risk', value: 65, color: '#10b981' },
  { name: 'Medium Risk', value: 25, color: '#f59e0b' },
  { name: 'High Risk', value: 10, color: '#ef4444' },
]

const authMethodsData = [
  { method: 'Password', count: 450 },
  { method: 'MFA', count: 280 },
  { method: 'Biometric', count: 150 },
  { method: 'Device Trust', count: 120 },
]

const customTooltip = (props: any) => {
  const { active, payload } = props
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded p-2 text-xs">
        <p className="text-foreground font-semibold">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function Charts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trust Score Trend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Trust Score Trend (24h)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trustTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip content={customTooltip} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Distribution */}
      <div className="card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={riskDistributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {riskDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Authentication Methods */}
      <div className="card lg:col-span-2">
        <h3 className="text-lg font-semibold text-foreground mb-4">Authentication Methods (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={authMethodsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="method" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip content={customTooltip} />
            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
