'use client'

import { create } from 'zustand'

const NEON_AUTH_URL = '/api/neon-auth'

interface User {
  id: string
  email: string
  name?: string
  mfa_enabled: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  register: (email: string, password: string, name?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

async function neonAuth(path: string, body?: Record<string, unknown>) {
  if (!NEON_AUTH_URL) throw new Error('Neon Auth is not configured')
  const response = await fetch(`${NEON_AUTH_URL.replace(/\/$/, '')}${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data.message || data.error || data.detail
    throw new Error(typeof detail === 'string' ? detail : `Authentication failed (${response.status})`)
  }
  return data
}

async function getNeonToken() {
  const data = await neonAuth('/token')
  const token = data.token || data.access_token
  if (!token) throw new Error('Neon Auth did not return an access token')
  return token as string
}

function userFromSession(session: any): User | null {
  const value = session?.user || session?.data?.user || session
  if (!value?.id || !value?.email) return null
  return { id: value.id, email: value.email, name: value.name, mfa_enabled: false, created_at: value.createdAt || new Date().toISOString() }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  register: async (email, password, name) => {
    set({ isLoading: true, error: null })
    try {
      // Email verification can intentionally prevent session creation. Do not
      // call /token here and do not treat registration as authentication.
      await neonAuth('/sign-up/email', { email: email.trim(), password, name: name || email.split('@')[0] })
      set({ user: null, accessToken: null, isInitialized: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      await neonAuth('/sign-in/email', { email: email.trim(), password })
      const token = await getNeonToken()
      const session = await neonAuth('/get-session')
      const user = userFromSession(session)
      if (!user) throw new Error('Neon Auth returned an invalid session')
      set({ user, accessToken: token, isInitialized: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try { await neonAuth('/sign-out') } finally {
      set({ user: null, accessToken: null, error: null, isInitialized: true })
    }
  },

  loadUser: async () => {
    if (typeof window === 'undefined') return
    try {
      const token = await getNeonToken()
      const session = await neonAuth('/get-session')
      const user = userFromSession(session)
      if (!user) throw new Error('Session expired')
      set({ user, accessToken: token, isInitialized: true, error: null })
    } catch {
      set({ user: null, accessToken: null, isInitialized: true })
    }
  },
}))

export { NEON_AUTH_URL, getNeonToken }

