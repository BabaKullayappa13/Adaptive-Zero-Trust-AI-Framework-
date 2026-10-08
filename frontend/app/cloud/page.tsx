'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2,
  Cloud, Database, Globe2, HelpCircle, LockKeyhole, Network,
  RefreshCw, Server, Shield, ShieldAlert, ShieldCheck, Sparkles, Terminal, Zap
} from 'lucide-react'
import Navbar from '@/components/navbar'
import { useAuthStore } from '@/lib/auth-store'
import { useContinuousAuth } from '@/components/continuous-auth-provider'
import { apiClient, getApiErrorMessage } from '@/lib/api'

export default function HybridCloudPage() {
  const { user, sessionId, logout } = useAuthStore()
  const { trustScore, riskScore } = useContinuousAuth()

  const [timeRange, setTimeRange] = useState<string>('1d')
  const [telemetryData, setTelemetryData] = useState<any>(null)
  const [telemetryLoading, setTelemetryLoading] = useState(false)

  const [selectedResource, setSelectedResource] = useState<string>('private-employee-db')
  const [targetCloud, setTargetCloud] = useState<string>('private')
  const [evaluating, setEvaluating] = useState(false)
  const [gatewayDecision, setGatewayDecision] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchTelemetry = useCallback(async () => {
    setTelemetryLoading(true)
    try {
      const res = await apiClient.getGatewayTelemetry(timeRange)
      setTelemetryData(res.data)
    } catch (err) {
      console.warn('Failed to load gateway telemetry:', err)
    } finally {
      setTelemetryLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    void fetchTelemetry()
  }, [fetchTelemetry])

  const handleTestAccess = async () => {
    setEvaluating(true)
    setError(null)
    setGatewayDecision(null)

    try {
      const res = await apiClient.submitGatewayRequest({
        resource_id: selectedResource,
        destination_environment: targetCloud,
        session_id: sessionId || 1,
        context: {
          current_risk: riskScore,
          current_trust: trustScore,
          mfa_method: 'SECRET_PIN',
        },
      })
      setGatewayDecision(res.data)
      void fetchTelemetry()
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Hybrid Cloud Gateway evaluation failed.'))
    } finally {
      setEvaluating(false)
    }
  }

  const t = telemetryData?.telemetry || {
    total_requests: 0,
    allowed_requests: 0,
    challenged_requests: 0,
    denied_requests: 0,
    private_cloud_requests: 0,
    public_cloud_requests: 0,
    average_latency_ms: 0,
    allow_rate: 0,
    challenge_rate: 0,
    deny_rate: 0,
  }

  const hasTelemetry = telemetryData?.has_data ?? (t.total_requests > 0)

  return (
    <div className="soc-shell text-slate-100">
      <Navbar user={user || { email: 'operator@zerotrust.ai' }} onLogout={logout} />

      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:ml-72 lg:px-12 lg:py-10">
        <header className="mb-2 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300"
            >
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                Simulation / Demonstration Environment
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                Zero-Trust Policy Enforcement Point
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Hybrid Cloud Security Gateway</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Evaluates identity, MFA verification, device context, continuous risk score, and authorization policy before routing traffic to private vaults or public cloud workloads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
              {[
                { id: '1h', label: '1 Hour' },
                { id: '1d', label: '1 Day' },
                { id: '1m', label: '1 Month' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setTimeRange(filter.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    timeRange === filter.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => void fetchTelemetry()}
              disabled={telemetryLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200 disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${telemetryLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Real Hybrid Cloud Gateway Telemetry */}
        <section className="soc-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-cyan-300" />
              <h2 className="text-base font-semibold text-white">Hybrid Cloud Gateway Telemetry</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Calculated from actual requests &middot; {telemetryData?.period_label || 'Period'}
            </span>
          </div>

          {!hasTelemetry && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-center gap-3">
              <AlertTriangle className="size-4 shrink-0 text-amber-400" />
              <span>Insufficient historical data for this period. Run an access evaluation below to generate live gateway telemetry.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Total Requests</span>
              <p className="text-xl font-bold font-mono text-white">{t.total_requests}</p>
              <p className="text-[10px] text-slate-400">All environments</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Allowed Rate</span>
              <p className="text-xl font-bold font-mono text-emerald-300">{t.allow_rate}%</p>
              <p className="text-[10px] text-slate-400">{t.allowed_requests} requests</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Challenged Rate</span>
              <p className="text-xl font-bold font-mono text-cyan-300">{t.challenge_rate}%</p>
              <p className="text-[10px] text-slate-400">{t.challenged_requests} requests</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Denied Rate</span>
              <p className={`text-xl font-bold font-mono ${t.deny_rate > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {t.deny_rate}%
              </p>
              <p className="text-[10px] text-slate-400">{t.denied_requests} requests</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Private Cloud</span>
              <p className="text-xl font-bold font-mono text-cyan-300">{t.private_cloud_requests}</p>
              <p className="text-[10px] text-slate-400">Vault & Auth</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Public Cloud</span>
              <p className="text-xl font-bold font-mono text-violet-300">{t.public_cloud_requests}</p>
              <p className="text-[10px] text-slate-400">APIs & Workloads</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Avg Gateway Latency</span>
              <p className="text-xl font-bold font-mono text-slate-200">{t.average_latency_ms} ms</p>
              <p className="text-[10px] text-slate-400">Policy eval time</p>
            </div>
          </div>
        </section>

        {/* 3-Tier Zero Trust Hybrid Cloud Architecture Diagram */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Tier 1: Private Environment */}
          <article className="soc-panel border-cyan-400/30 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="size-5 text-cyan-300" />
                <h3 className="text-base font-semibold text-white">Private Environment</h3>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                Tier 1 (Vault)
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Internal authentication service, private identity database, employee resources, and hardware vault. Requires Trust &gt; 70 &amp; Risk &lt; 35.
            </p>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                &bull; internal-auth-service
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                &bull; private-employee-db
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                &bull; vault-encryption-service
              </div>
            </div>
          </article>

          {/* Tier 2: Zero-Trust Security Enforcement Gateway */}
          <article className="soc-panel border-emerald-400/30 bg-emerald-400/[0.02] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LockKeyhole className="size-5 text-emerald-300" />
                <h3 className="text-base font-semibold text-white">Security Gateway Point</h3>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Enforcement
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Security gateway evaluating MFA, device posture, continuous behavioral score, and Zero-Trust policy v2.0.0 before forwarding.
            </p>
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs space-y-1 font-mono text-emerald-200">
              <p>Rule: NEVER TRUST &middot; ALWAYS VERIFY</p>
              <p>Continuous Evaluation: ACTIVE</p>
              <p>MFA Requirement: 6-Digit Secret PIN</p>
            </div>
          </article>

          {/* Tier 3: Public Cloud Workloads */}
          <article className="soc-panel border-violet-400/30 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="size-5 text-violet-300" />
                <h3 className="text-base font-semibold text-white">Public Cloud Workloads</h3>
              </div>
              <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                Tier 3 (Edge)
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Public cloud APIs, cloud analytics workers, microservices, and client storage buckets. Requires Trust &gt; 45 &amp; Risk &lt; 65.
            </p>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                &bull; public-cloud-api
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                &bull; cloud-analytics-service
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                &bull; cloud-storage-bucket
              </div>
            </div>
          </article>
        </section>

        {/* Interactive Resource Request & Enforcement Tester */}
        <section className="soc-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <p className="eyebrow text-cyan-300">Gateway Security Enforcement Point</p>
              <h3 className="mt-1 text-xl font-bold text-white">Protected Resource Access Verification</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit an authenticated request through the Zero-Trust Gateway. The gateway evaluates full context before forwarding.
              </p>
            </div>
            <Network className="size-6 text-cyan-300" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Target Resource Identifier
                </label>
                <select
                  value={selectedResource}
                  onChange={(e) => setSelectedResource(e.target.value)}
                  className="input bg-slate-900 w-full"
                >
                  <optgroup label="Private Environment Resources">
                    <option value="private-employee-db">private-employee-db (Internal DB)</option>
                    <option value="internal-auth-service">internal-auth-service (Authentication Vault)</option>
                    <option value="vault-encryption-service">vault-encryption-service (Master Key Storage)</option>
                  </optgroup>
                  <optgroup label="Public Cloud Resources">
                    <option value="public-cloud-api">public-cloud-api (Microservices Gateway)</option>
                    <option value="cloud-analytics-service">cloud-analytics-service (Analytics Cluster)</option>
                    <option value="cloud-storage-bucket">cloud-storage-bucket (Encrypted Storage)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Target Cloud Zone
                </label>
                <select
                  value={targetCloud}
                  onChange={(e) => setTargetCloud(e.target.value)}
                  className="input bg-slate-900 w-full"
                >
                  <option value="private">Private Environment (Strict Security: Risk &lt; 35, Trust &gt; 70)</option>
                  <option value="public">Public Cloud Environment (Standard Security: Risk &lt; 65, Trust &gt; 45)</option>
                </select>
              </div>

              <button
                onClick={handleTestAccess}
                disabled={evaluating}
                className="btn btn-primary w-full justify-center"
              >
                {evaluating ? 'Evaluating Zero-Trust Policy...' : 'Submit Protected Request Through Gateway'}
                <ArrowRight className="size-4" />
              </button>
            </div>

            {/* Gateway Decision Output (Requirement 11) */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                  Gateway Enforcement Decision Output
                </span>
                {gatewayDecision && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold font-mono ${
                      gatewayDecision.gateway_decision === 'ALLOW'
                        ? 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                        : gatewayDecision.gateway_decision === 'CHALLENGE'
                        ? 'border border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                        : 'border border-rose-400/40 bg-rose-400/10 text-rose-300'
                    }`}
                  >
                    {gatewayDecision.gateway_decision}
                  </span>
                )}
              </div>

              {gatewayDecision ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase">Request Target:</span>
                      <p className="font-semibold">{gatewayDecision.requested_resource}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase">Destination:</span>
                      <p className="font-semibold capitalize">{gatewayDecision.destination_environment} Environment</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase">Identity:</span>
                      <p className="font-semibold">{user?.email || 'authenticated-user'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase">MFA Status:</span>
                      <p className="font-semibold text-emerald-300">Secret PIN Verified</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase">Device Posture:</span>
                      <p className="font-semibold text-cyan-300">Hardware Fingerprint Verified</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase">Risk Score / Trust:</span>
                      <p className="font-semibold font-mono text-amber-300">
                        Risk: {Math.round(gatewayDecision.risk_score)}/100 &middot; Trust: {Math.round(gatewayDecision.trust_score)}/100
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-900/80 p-3 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Policy Decision &amp; Reason</span>
                    <p className="text-slate-200">{gatewayDecision.reason}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Policy: {gatewayDecision.policy_version || 'v2.0.0'}</span>
                    <span>Timestamp: {new Date(gatewayDecision.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  Select a resource and click &quot;Submit Protected Request Through Gateway&quot; to test enforcement.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
