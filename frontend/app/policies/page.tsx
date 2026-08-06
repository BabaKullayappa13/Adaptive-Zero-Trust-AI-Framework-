'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useEffect } from 'react'
import Navbar from '@/components/navbar'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'

const mockPolicies = [
  {
    id: 1,
    name: 'Standard Access Policy',
    description: 'Default policy for all authenticated users',
    enabled: true,
    rules: 4,
  },
  {
    id: 2,
    name: 'High-Risk Detection',
    description: 'Triggers additional verification for unusual activity',
    enabled: true,
    rules: 6,
  },
  {
    id: 3,
    name: 'Geographic Restriction',
    description: 'Restricts access from outside approved regions',
    enabled: false,
    rules: 3,
  },
]

export default function PoliciesPage() {
  const router = useRouter()
  const { user, accessToken, isInitialized, logout, loadUser } = useAuthStore()

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    if (isInitialized && (!user || !accessToken)) {
      router.push('/auth/login')
    }
  }, [user, accessToken, isInitialized, router])

  if (!isInitialized || !user || !accessToken) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={logout} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">Zero Trust Policies</h1>
              <p className="text-slate-400">Define and manage access policies and security rules</p>
            </div>
            <button className="btn btn-primary flex items-center gap-2">
              <Plus size={20} />
              New Policy
            </button>
          </div>

          {/* Policies List */}
          <div className="space-y-4">
            {mockPolicies.map((policy) => (
              <div
                key={policy.id}
                className="card border border-slate-700 hover:border-slate-600 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{policy.name}</h3>
                      {policy.enabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/20 text-success text-xs rounded-full font-medium">
                          <span className="w-2 h-2 bg-success rounded-full"></span>
                          Active
                        </span>
                      )}
                      {!policy.enabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full font-medium">
                          <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{policy.description}</p>
                    <div className="text-xs text-slate-500">{policy.rules} security rules</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-foreground">
                      <Eye size={18} />
                    </button>
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-foreground">
                      <Edit2 size={18} />
                    </button>
                    <button className="p-2 hover:bg-red-900/20 rounded-lg transition text-slate-400 hover:text-red-400">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rule Types Info */}
          <div className="card bg-slate-900/50 border-dashed border border-slate-700">
            <h3 className="text-lg font-semibold text-foreground mb-4">Available Rule Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <div>
                  <p className="font-medium text-foreground">Behavioral Rules</p>
                  <p className="text-sm text-slate-400">Anomaly detection based on user behavior</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <div>
                  <p className="font-medium text-foreground">Geographic Rules</p>
                  <p className="text-sm text-slate-400">Location and velocity-based restrictions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <div>
                  <p className="font-medium text-foreground">Temporal Rules</p>
                  <p className="text-sm text-slate-400">Time-based access controls</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <div>
                  <p className="font-medium text-foreground">Device Rules</p>
                  <p className="text-sm text-slate-400">Device trust and fingerprinting rules</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
