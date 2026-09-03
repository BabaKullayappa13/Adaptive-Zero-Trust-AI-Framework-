'use client'

import { create } from 'zustand'

export interface User {
  id: string
  email: string
  name?: string
  mfa_enabled: boolean
  pin_configured: boolean
  email_verified?: boolean
  created_at: string
}

export interface LoginResult {
  status: 'SUCCESS' | 'MFA_REQUIRED'
  challenge_token?: string
  challenge_type?: string
  risk_level?: string
  risk_score?: number
  is_new_device?: boolean
  secure_pin_configured?: boolean
  email_verified?: boolean
  message?: string
  access_token?: string
  refresh_token?: string
  session_id?: number
  user?: User
}

export interface MfaFactorsResponse {
  email: string
  name?: string
  factors: {
    email_verified: { active: boolean; name: string }
    password_active: { active: boolean; name: string }
    captcha_protection: { active: boolean; name: string }
    otp_protection: { active: boolean; name: string }
    secure_pin: { active: boolean; name: string; last_updated: string }
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  sessionId: number | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Core Authentication & Registration
  register: (email: string, password: string, name?: string, secretPin?: string) => Promise<any>
  verifyEmail: (email: string, verificationCode: string) => Promise<any>
  resendEmailVerification: (email: string) => Promise<any>
  setupSecurePin: (email: string, secretPin: string, confirmPin: string) => Promise<any>
  getSecurePinStatus: (email: string) => Promise<{ exists: boolean; secure_pin_configured: boolean; email_verified: boolean }>

  // Multi-Factor Authentication Progression
  login: (email: string, password: string, secretPin?: string, totpCode?: string) => Promise<LoginResult>
  generateCaptcha: () => Promise<{ challenge_id: string; question: string }>
  verifyCaptcha: (challengeId: string, solution: string) => Promise<boolean>
  sendOtp: (email: string) => Promise<{ demo_otp?: string; challenge_id: string }>
  verifyOtp: (email: string, otpCode: string) => Promise<boolean>
  verifySecurePin: (email: string, secretPin: string) => Promise<boolean>
  loginMfaComplete: (email: string) => Promise<LoginResult>
  verifyPinChallenge: (challengeToken: string, secretPin: string) => Promise<void>

  // Recovery & Factor Management
  forgotSecurePin: (email: string) => Promise<{ demo_recovery_code?: string; message: string }>
  resetSecurePin: (email: string, recoveryCode: string, newSecretPin: string, confirmNewSecretPin: string) => Promise<any>
  changeSecurePin: (currentPassword: string, newSecretPin: string, confirmNewSecretPin: string) => Promise<any>
  getMfaFactors: () => Promise<MfaFactorsResponse | null>

  logout: () => Promise<void>
  loadUser: () => Promise<void>
  setSessionId: (id: number | null) => void
}

const TOKEN_KEY = 'azt_access_token'
const REFRESH_KEY = 'azt_refresh_token'
const USER_KEY = 'azt_user_profile'
const SESSION_KEY = 'azt_session_id'

async function readApiResponse<T = Record<string, unknown>>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  const raw = await response.text()
  if (!raw.trim()) return {} as T
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw) as T
    } catch {
      throw new Error('The security service returned malformed JSON.')
    }
  }
  const message = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  throw new Error(message ? message.slice(0, 180) : 'The security service returned an unexpected response.')
}

function apiError(data: Record<string, unknown>, fallback: string) {
  return typeof data.detail === 'string' ? data.detail : typeof data.message === 'string' ? data.message : fallback
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  sessionId: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  setSessionId: (id: number | null) => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(SESSION_KEY, String(id))
    }
    set({ sessionId: id })
  },

  register: async (email: string, password: string, name?: string, secretPin?: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name || 'Operator',
          secret_pin: secretPin ? secretPin.trim() : undefined
        })
      })
      const data = await readApiResponse<Record<string, any>>(res)
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed')
      }
      set({ isLoading: false })
      return data
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Registration failed' })
      throw err
    }
  },

  verifyEmail: async (email: string, verificationCode: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          verification_code: verificationCode.trim()
        })
      })
      const data = await readApiResponse<Record<string, any>>(res)
      if (!res.ok) {
        throw new Error(data.detail || 'Email verification failed')
      }
      set({ isLoading: false })
      return data
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Email verification failed' })
      throw err
    }
  },

  resendEmailVerification: async (email: string) => {
    try {
      const res = await fetch('/api/auth/resend-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      const data = await readApiResponse<Record<string, any>>(res)
      if (!res.ok) throw new Error(data.detail || 'Failed to resend verification')
      return data
    } catch (err: any) {
      throw err
    }
  },

  setupSecurePin: async (email: string, secretPin: string, confirmPin: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/auth/setup-secure-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          secret_pin: secretPin.trim(),
          confirm_pin: confirmPin.trim()
        })
      })
      const data = await readApiResponse<Record<string, any>>(res)
      if (!res.ok) {
        throw new Error(data.detail || 'Secure PIN setup failed')
      }
      set({ isLoading: false })
      return data
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Secure PIN setup failed' })
      throw err
    }
  },

  getSecurePinStatus: async (email: string) => {
    try {
      const res = await fetch(`/api/auth/secure-pin-status?email=${encodeURIComponent(email.trim())}`)
      if (!res.ok) return { exists: false, secure_pin_configured: false, email_verified: false }
      return await readApiResponse(res)
    } catch {
      return { exists: false, secure_pin_configured: false, email_verified: false }
    }
  },

  generateCaptcha: async () => {
    const res = await fetch('/api/auth/captcha/generate', { method: 'POST' })
    const data = await readApiResponse<{ challenge_id: string; question: string; detail?: string }>(res)
    if (!res.ok) throw new Error(data.detail || 'Failed to generate CAPTCHA')
    return data
  },

  verifyCaptcha: async (challengeId: string, solution: string) => {
    const res = await fetch('/api/auth/captcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge_id: challengeId, solution: solution.trim() })
    })
    const data = await readApiResponse<Record<string, any>>(res)
    if (!res.ok) throw new Error(data.detail || 'Incorrect CAPTCHA solution')
    return true
  },

  sendOtp: async (email: string) => {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    })
    const data = await readApiResponse<{ demo_otp?: string; challenge_id: string; detail?: string }>(res)
    if (!res.ok) throw new Error(data.detail || 'Failed to send OTP')
    return data
  },

  verifyOtp: async (email: string, otpCode: string) => {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), otp_code: otpCode.trim() })
    })
    const data = await readApiResponse<Record<string, any>>(res)
    if (!res.ok) throw new Error(data.detail || 'Incorrect OTP code')
    return true
  },

  verifySecurePin: async (email: string, secretPin: string) => {
    const res = await fetch('/api/auth/verify-secure-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), secret_pin: secretPin.trim() })
    })
    const data = await readApiResponse<Record<string, any>>(res)
    if (!res.ok) throw new Error(data.detail || 'Incorrect Secure PIN')
    return true
  },

  loginMfaComplete: async (email: string): Promise<LoginResult> => {
    set({ isLoading: true, error: null })
    try {
      const deviceInfo = typeof window !== 'undefined' ? {
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform
      } : {}

      const res = await fetch('/api/auth/login-mfa-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          device_info: deviceInfo
        })
      })

      const data = await readApiResponse<Record<string, any>>(res)
      if (!res.ok) throw new Error(data.detail || 'Authentication failed')

      const token = data.access_token
      const user = data.user
      const sessionId = data.session_id

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token)
        if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        if (sessionId) localStorage.setItem(SESSION_KEY, String(sessionId))
        document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`
      }

      set({
        user,
        accessToken: token,
        sessionId: sessionId || 1,
        isLoading: false,
        isInitialized: true,
        error: null
      })

      return data as LoginResult
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'MFA completion failed' })
      throw err
    }
  },

  login: async (email: string, password: string, secretPin?: string, totpCode?: string): Promise<LoginResult> => {
    set({ isLoading: true, error: null })
    try {
      const deviceInfo = typeof window !== 'undefined' ? {
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform
      } : {}

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          secret_pin: secretPin?.trim() || undefined,
          totp_code: totpCode?.trim() || undefined,
          device_info: deviceInfo
        })
      })

      const data = await readApiResponse<Record<string, any>>(res)

      if (!res.ok) {
        const errorMsg = data.detail || 'Invalid email or password.'
        set({ isLoading: false, error: errorMsg })
        throw new Error(errorMsg)
      }

      if (data.status === 'MFA_REQUIRED') {
        set({ isLoading: false })
        return data as LoginResult
      }

      const token = data.access_token
      const user = data.user
      const sessionId = data.session_id

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token)
        if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        if (sessionId) localStorage.setItem(SESSION_KEY, String(sessionId))
        document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`
      }

      set({
        user,
        accessToken: token,
        sessionId: sessionId || 1,
        isLoading: false,
        isInitialized: true,
        error: null
      })

      return data as LoginResult
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' })
      throw err
    }
  },

  verifyPinChallenge: async (challengeToken: string, secretPin: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_token: challengeToken,
          secret_pin: secretPin.trim()
        })
      })

      const data = await readApiResponse<Record<string, any>>(res)

      if (!res.ok) {
        const errorMsg = data.detail || 'Secret PIN verification failed.'
        set({ isLoading: false, error: errorMsg })
        throw new Error(errorMsg)
      }

      const token = data.access_token
      const user = data.user
      const sessionId = data.session_id

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token)
        if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        if (sessionId) localStorage.setItem(SESSION_KEY, String(sessionId))
        document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`
      }

      set({
        user,
        accessToken: token,
        sessionId: sessionId || 1,
        isLoading: false,
        isInitialized: true,
        error: null
      })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Verification failed' })
      throw err
    }
  },

  forgotSecurePin: async (email: string) => {
    const res = await fetch('/api/auth/forgot-secure-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    })
    const data = await readApiResponse<{ demo_recovery_code?: string; message: string; detail?: string }>(res)
    if (!res.ok) throw new Error(data.detail || 'Failed to request recovery code')
    return data
  },

  resetSecurePin: async (email: string, recoveryCode: string, newSecretPin: string, confirmNewSecretPin: string) => {
    const res = await fetch('/api/auth/reset-secure-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        recovery_code: recoveryCode.trim(),
        new_secret_pin: newSecretPin.trim(),
        confirm_new_secret_pin: confirmNewSecretPin.trim()
      })
    })
    const data = await readApiResponse<Record<string, any>>(res)
    if (!res.ok) throw new Error(data.detail || 'PIN reset failed')
    return data
  },

  changeSecurePin: async (currentPassword: string, newSecretPin: string, confirmNewSecretPin: string) => {
    const token = get().accessToken
    const res = await fetch('/api/auth/change-secure-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_secret_pin: newSecretPin.trim(),
        confirm_new_secret_pin: confirmNewSecretPin.trim()
      })
    })
    const data = await readApiResponse<Record<string, any>>(res)
    if (!res.ok) throw new Error(data.detail || 'Failed to change PIN')
    return data
  },

  getMfaFactors: async () => {
    const token = get().accessToken
    if (!token) return null
    try {
      const res = await fetch('/api/auth/mfa-factors', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return null
      return await readApiResponse(res)
    } catch {
      return null
    }
  },

  logout: async () => {
    const token = get().accessToken
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
      } catch {
        // Ignore logout errors
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(SESSION_KEY)
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }

    set({
      user: null,
      accessToken: null,
      sessionId: null,
      isInitialized: true,
      error: null
    })
  },

  loadUser: async () => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem(TOKEN_KEY)
    const rawUser = localStorage.getItem(USER_KEY)
    const rawSession = localStorage.getItem(SESSION_KEY)

    if (!token) {
      set({ user: null, accessToken: null, sessionId: null, isInitialized: true })
      return
    }

    let parsedUser: User | null = null
    try {
      if (rawUser) parsedUser = JSON.parse(rawUser)
    } catch {
      // Ignored
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const freshUser = await res.json()
        set({
          user: freshUser,
          accessToken: token,
          sessionId: rawSession ? parseInt(rawSession, 10) : 1,
          isInitialized: true
        })
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
      } else {
        if (parsedUser) {
          set({
            user: parsedUser,
            accessToken: token,
            sessionId: rawSession ? parseInt(rawSession, 10) : 1,
            isInitialized: true
          })
        } else {
          set({ user: null, accessToken: null, sessionId: null, isInitialized: true })
        }
      }
    } catch {
      set({
        user: parsedUser,
        accessToken: token,
        sessionId: rawSession ? parseInt(rawSession, 10) : 1,
        isInitialized: true
      })
    }
  }
}))

export async function getNeonToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}
