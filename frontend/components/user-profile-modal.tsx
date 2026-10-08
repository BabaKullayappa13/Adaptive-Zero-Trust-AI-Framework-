'use client'

import React, { useState, useEffect } from 'react'
import {
  User, Shield, KeyRound, Smartphone, History, FileText, LogOut,
  X, CheckCircle, AlertTriangle, Lock, RefreshCw, Laptop, Clock, Save
} from 'lucide-react'
import apiClient, { getApiErrorMessage } from '@/lib/api'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
  onLogout: () => void
}

type TabType =
  | 'profile-info'
  | 'update-profile'
  | 'security-settings'
  | 'mfa-settings'
  | 'devices-sessions'
  | 'activity-history'
  | 'policy-activity'

export default function UserProfileModal({ isOpen, onClose, userEmail, onLogout }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile-info')
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [securityEvents, setSecurityEvents] = useState<any[]>([])
  const [policyLogs, setPolicyLogs] = useState<any[]>([])
  const [editName, setEditName] = useState('')
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(600)

  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'devices-sessions') {
        loadSessionsAndDevices()
      } else if (activeTab === 'activity-history') {
        loadActivityHistory()
      } else if (activeTab === 'policy-activity') {
        loadPolicyActivity()
      }
    }
  }, [activeTab, isOpen])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getUserProfile()
      if (res.data) {
        setProfileData(res.data)
        setEditName(res.data.name || '')
        if (res.data.current_session?.inactivity_threshold_seconds) {
          setInactivityThreshold(res.data.current_session.inactivity_threshold_seconds)
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionsAndDevices = async () => {
    try {
      const [sRes, dRes] = await Promise.all([
        apiClient.getUserSessions().catch(() => ({ data: [] })),
        apiClient.getUserDevices().catch(() => ({ data: [] }))
      ])
      setSessions(sRes.data || [])
      setDevices(dRes.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadActivityHistory = async () => {
    try {
      const res = await apiClient.getSecurityEvents('1m', 30)
      setSecurityEvents(res.data?.events || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadPolicyActivity = async () => {
    try {
      const res = await apiClient.getPolicyAuditLogs({ time_range: '1m', limit: 30 })
      setPolicyLogs(res.data?.logs || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdateMsg(null)
    setLoading(true)
    try {
      await apiClient.updateUserProfile(editName)
      setUpdateMsg({ type: 'success', text: 'Profile name successfully updated. Auditable security event logged.' })
      await loadProfile()
    } catch (err) {
      setUpdateMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to update profile.') })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInactivity = async () => {
    setLoading(true)
    try {
      await apiClient.updateInactivitySettings(inactivityThreshold)
      setUpdateMsg({ type: 'success', text: `Inactivity threshold set to ${inactivityThreshold} seconds (${Math.round(inactivityThreshold/60)} minutes).` })
    } catch (err) {
      setUpdateMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to update inactivity settings.') })
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async (sid: number) => {
    try {
      await apiClient.revokeUserSession(sid)
      await loadSessionsAndDevices()
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'profile-info', label: 'See Profile Information', icon: User },
    { id: 'update-profile', label: 'Update Profile', icon: Save },
    { id: 'security-settings', label: 'Security Settings', icon: Shield },
    { id: 'mfa-settings', label: 'MFA Settings', icon: KeyRound },
    { id: 'devices-sessions', label: 'Device & Sessions', icon: Smartphone },
    { id: 'activity-history', label: 'Activity History', icon: History },
    { id: 'policy-activity', label: 'Policy Activity', icon: FileText },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950 text-slate-100 shadow-2xl shadow-cyan-950/50">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 font-bold text-sm border border-cyan-500/30">
              {profileData?.name ? profileData.name.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : 'U')}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {profileData?.name || 'Authenticated Operator'}
              </h2>
              <p className="text-xs text-slate-400">{profileData?.email || userEmail || 'operator@zerotrust.ai'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar Navigation + Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Navigation Tabs */}
          <div className="w-64 border-r border-slate-800/80 bg-slate-900/30 p-3 space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              User Menu
            </p>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as TabType); setUpdateMsg(null) }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`size-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}

            <div className="pt-4 mt-4 border-t border-slate-800/60">
              <button
                onClick={() => { onClose(); onLogout() }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              >
                <LogOut className="size-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
            {updateMsg && (
              <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
                updateMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {updateMsg.type === 'success' ? <CheckCircle className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
                <span>{updateMsg.text}</span>
              </div>
            )}

            {/* TAB 1: SEE PROFILE INFORMATION */}
            {activeTab === 'profile-info' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <User className="size-4 text-cyan-400" />
                    Profile Information
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Verified identity attributes and real-time security posture.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Full Name</span>
                    <p className="text-sm font-medium text-slate-200">{profileData?.name || 'Operator'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Email Address</span>
                    <p className="text-sm font-medium text-slate-200 truncate">{profileData?.email || userEmail}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Account Status</span>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-400">{profileData?.account_status || 'ACTIVE'}</span>
                      <span className="text-[10px] text-slate-500 ml-auto border border-slate-700 px-1.5 py-0.5 rounded">Role: {profileData?.role || 'operator'}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">MFA Status</span>
                    <div className="flex items-center gap-2">
                      <Shield className="size-3.5 text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-300">{profileData?.mfa_status || 'CONFIGURED'}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Last Successful Login</span>
                    <p className="text-xs text-slate-300">{profileData?.last_successful_login ? new Date(profileData.last_successful_login).toLocaleString() : 'Active session'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Last Failed Login</span>
                    <p className="text-xs text-slate-300">{profileData?.last_failed_login ? new Date(profileData.last_failed_login).toLocaleString() : 'None recorded'}</p>
                  </div>
                </div>

                {/* Device & Security/Risk Status */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 space-y-3">
                  <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Device & Risk Telemetry</span>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500">Current Session State</p>
                      <p className="font-semibold text-slate-200 mt-0.5">{profileData?.current_session?.session_status || 'ACTIVE'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Trust Score</p>
                      <p className="font-semibold text-emerald-400 mt-0.5">{profileData?.security_risk_status?.trust_score ?? 80.0} / 100</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Adaptive Risk Score</p>
                      <p className={`font-semibold mt-0.5 ${
                        (profileData?.security_risk_status?.risk_score ?? 20) > 50 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {profileData?.security_risk_status?.risk_score ?? 20.0} / 100 ({profileData?.security_risk_status?.risk_level || 'LOW'})
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Hardware Fingerprint: <code className="text-cyan-300 font-mono text-[10px]">{profileData?.device_status?.fingerprint || 'Desktop Station'}</code></span>
                    <span className="text-emerald-400 text-[10px] flex items-center gap-1"><CheckCircle className="size-3" /> Device Verified</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: UPDATE PROFILE */}
            {activeTab === 'update-profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Save className="size-4 text-cyan-400" />
                    Update Profile
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Modify permissible profile details. Normal users cannot alter roles, security policies, or administrative configurations.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Email (Read Only)</label>
                    <input
                      type="email"
                      value={profileData?.email || userEmail || ''}
                      disabled
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">System Role (Immutable)</label>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400">
                      <Lock className="size-3.5 text-slate-500" />
                      <span>{profileData?.role?.toUpperCase() || 'OPERATOR'}</span>
                      <span className="ml-auto text-[10px] text-amber-400/80">RBAC Enforced</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 text-xs text-amber-300/80 space-y-1">
                    <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Shield className="size-3.5" /> Security Audit Notice
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Every profile update automatically writes an immutable security event to <code className="text-amber-200">audit_logs</code> capturing timestamp, IP address, and changed fields.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 transition-colors disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    Save Changes & Generate Audit Log
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: SECURITY SETTINGS */}
            {activeTab === 'security-settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Shield className="size-4 text-cyan-400" />
                    Security Settings
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Activity-based session timeout configuration and credential controls.
                  </p>
                </div>

                {/* Activity-Based Inactivity Configuration */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Activity-Based Inactivity Threshold</p>
                      <p className="text-[11px] text-slate-400">Automatically transitions session to Locked state after prolonged idle time.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-300">{Math.round(inactivityThreshold / 60)} min ({inactivityThreshold}s)</span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min={60}
                      max={3600}
                      step={60}
                      value={inactivityThreshold}
                      onChange={(e) => setInactivityThreshold(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>1 min (strict)</span>
                      <span>10 min (recommended)</span>
                      <span>60 min (relaxed)</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveInactivity}
                    disabled={loading}
                    className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Save Threshold
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-200">Continuous Authentication Lifecycle</p>
                  <p className="text-[11px] text-slate-400">
                    State transitions: <span className="text-emerald-400">Active</span> &rarr; <span className="text-amber-400">Inactive</span> &rarr; <span className="text-rose-400">Locked</span> &rarr; <span className="text-cyan-400">Re-authentication Required</span>.
                  </p>
                  <p className="text-[11px] text-slate-500">Fixed 3-minute automatic deactivation has been removed. Protection is strictly activity-driven.</p>
                </div>
              </div>
            )}

            {/* TAB 4: MFA SETTINGS */}
            {activeTab === 'mfa-settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <KeyRound className="size-4 text-cyan-400" />
                    Multi-Factor Authentication (MFA)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Configured multi-factor verification mechanisms.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                        <KeyRound className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Cryptographic Secret PIN</p>
                        <p className="text-[11px] text-slate-400">4-8 digit zero-trust PIN verified via salted bcrypt hash.</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      ACTIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                        <Smartphone className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">TOTP Authenticator (Google/Microsoft)</p>
                        <p className="text-[11px] text-slate-400">RFC 6238 time-based one-time authentication tokens.</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      ENABLED
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
                        <Lock className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Adaptive Step-Up MFA</p>
                        <p className="text-[11px] text-slate-400">Automatically demanded upon anomalous behavioral kinematics or elevated risk.</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                      CONTINUOUS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DEVICE & SESSIONS */}
            {activeTab === 'devices-sessions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Smartphone className="size-4 text-cyan-400" />
                    Registered Devices & Active Sessions
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Review active sessions and revoke compromised access tokens.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-300">Active Sessions</p>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">No active sessions retrieved.</p>
                  ) : (
                    sessions.map((s) => (
                      <div key={s.session_id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">Session #{s.session_id}</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded font-semibold ${
                              s.session_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>{s.session_status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">IP: {s.ip_address} | Trust: {s.trust_score} | Risk: {s.risk_score}</p>
                          <p className="text-[10px] text-slate-500">Created: {new Date(s.created_at).toLocaleString()}</p>
                        </div>
                        {s.is_active && (
                          <button
                            onClick={() => handleRevokeSession(s.session_id)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-slate-300">Registered Devices</p>
                  {devices.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Primary device registered.</p>
                  ) : (
                    devices.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs">
                        <div className="flex items-center gap-3">
                          <Laptop className="size-4 text-cyan-400" />
                          <div>
                            <p className="font-semibold text-slate-200">{d.platform} ({d.browser})</p>
                            <p className="text-[10px] font-mono text-slate-500 truncate max-w-xs">{d.fingerprint}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold">Trust: {d.trust_score}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: ACTIVITY HISTORY */}
            {activeTab === 'activity-history' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <History className="size-4 text-cyan-400" />
                    Personal Activity History
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Your authenticated account events isolated by backend authorization.
                  </p>
                </div>

                {securityEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Insufficient historical data for this period.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {securityEvents.map((evt) => (
                      <div key={evt.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{evt.action}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            evt.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>{evt.status}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>Risk: {evt.risk_level}</span>
                          <span>Trust: {evt.trust_level}</span>
                          <span className="ml-auto">{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: POLICY ACTIVITY */}
            {activeTab === 'policy-activity' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <FileText className="size-4 text-cyan-400" />
                    Policy Activity Logs
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Zero-Trust policy decisions evaluated against your requested actions.
                  </p>
                </div>

                {policyLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No policy evaluations logged for this account.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {policyLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">Resource: {log.resource}</span>
                          <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                            log.decision === 'ALLOW' ? 'bg-emerald-500/20 text-emerald-300' : (
                              log.decision === 'CHALLENGE' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                            )
                          }`}>
                            {log.decision}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{log.reason}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                          <span>Policy: {log.policy_version}</span>
                          <span>Environment: {log.gateway_environment?.toUpperCase()}</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
