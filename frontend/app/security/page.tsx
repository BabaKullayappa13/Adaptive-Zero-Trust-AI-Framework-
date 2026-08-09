'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useEffect } from 'react'
import Navbar from '@/components/navbar'
import { Shield, Lock, Key, Smartphone } from 'lucide-react'

export default function SecurityPage() {
  const router = useRouter()
  const { user, accessToken, logout } = useAuthStore()

  useEffect(() => {
    if (!user || !accessToken) {
      router.push('/auth/login')
    }
  }, [user, accessToken, router])

  if (!user || !accessToken) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={logout} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Security Settings</h1>
            <p className="text-slate-400">Manage your account security and authentication methods</p>
          </div>

          {/* Security Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password */}
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Lock className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Password</h3>
                  <p className="text-sm text-slate-400">Password history is unavailable</p>
                </div>
              </div>
              <button type="button" className="btn btn-secondary w-full" onClick={() => router.push('/auth/reset-password')}>Change Password</button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Smartphone className="text-warning" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Two-Factor Auth</h3>
                  <p className="text-sm text-slate-400">Not enabled</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-slate-300">Multi-factor authentication is managed by Neon Auth.</div>
            </div>

            {/* API Keys */}
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Key className="text-secondary" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">API Keys</h3>
                  <p className="text-sm text-slate-400">API key management is not configured</p>
                </div>
              </div>
              <button type="button" className="btn btn-secondary w-full" disabled title="API key management is not configured">Manage Keys</button>
            </div>

            {/* Trusted Devices */}
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Shield className="text-success" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Trusted Devices</h3>
                  <p className="text-sm text-slate-400">Trusted device data is unavailable</p>
                </div>
              </div>
              <button type="button" className="btn btn-secondary w-full" disabled title="Trusted device data is unavailable">View Devices</button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="card">
            <h3 className="text-xl font-semibold text-foreground mb-4">Active Sessions</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div>
                  <p className="font-medium text-foreground">Current Session</p>
                  <p className="text-sm text-slate-400">Current session details are unavailable</p>
                </div>
                <span className="px-3 py-1 bg-success/20 text-success text-sm rounded-full">Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
