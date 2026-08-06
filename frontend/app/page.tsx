'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const { user, accessToken, loadUser } = useAuthStore()

  useEffect(() => {
    loadUser()
  }, [loadUser])

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (user && accessToken) {
      router.push('/dashboard')
    }
  }, [user, accessToken, router])

  if (user && accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-xl text-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">🔐 Zero Trust AI</h1>
          <nav className="flex gap-4">
            <Link href="/auth/login" className="text-foreground hover:text-primary transition">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn btn-primary">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center space-y-8 fade-in">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-foreground leading-tight">
              Enterprise-Grade Security with <span className="text-primary">AI Intelligence</span>
            </h2>
            <p className="text-xl text-slate-400">
              Adaptive zero trust architecture with continuous authentication and AI-powered risk detection
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
            <div className="card text-left space-y-3">
              <div className="text-3xl">🛡️</div>
              <h3 className="text-lg font-semibold text-foreground">Zero Trust Architecture</h3>
              <p className="text-sm text-slate-400">Never trust by default, always verify every access request</p>
            </div>

            <div className="card text-left space-y-3">
              <div className="text-3xl">🤖</div>
              <h3 className="text-lg font-semibold text-foreground">AI Risk Detection</h3>
              <p className="text-sm text-slate-400">Machine learning models detect anomalies in real-time</p>
            </div>

            <div className="card text-left space-y-3">
              <div className="text-3xl">📊</div>
              <h3 className="text-lg font-semibold text-foreground">Continuous Monitoring</h3>
              <p className="text-sm text-slate-400">Real-time trust scoring and behavioral analysis</p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/auth/login" className="btn btn-primary px-8 py-3">
              Sign In →
            </Link>
            <Link href="/auth/register" className="btn btn-secondary px-8 py-3">
              Create Account
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8 px-6 text-center text-slate-500">
        <p>&copy; 2026 Adaptive Zero Trust-AI Framework for Continuous Multi-Factor Authentication in Hybrid Cloud Security.</p>
      </footer>
    </div>
  )
}
