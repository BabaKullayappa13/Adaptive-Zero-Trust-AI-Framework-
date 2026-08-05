import { create } from 'zustand'
import { apiClient } from './api'

interface User {
  id: string
  email: string
  mfa_enabled: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  register: (email: string, password: string, name?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setupMFA: (userId: string) => Promise<any>
  verifyMFA: (userId: string, totpCode: string) => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken })
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
    }
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  register: async (email, password, name) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.register(email, password, name)
      const userData: User = response.data
      set({ user: userData, error: null })
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Registration failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.login(email, password)
      const { access_token, refresh_token } = response.data
      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user: {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          email,
          mfa_enabled: false,
          created_at: new Date().toISOString(),
        },
        error: null,
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        localStorage.setItem('user_email', email)
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    set({ user: null, accessToken: null, refreshToken: null, error: null })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_email')
    }
  },

  setupMFA: async (userId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.setupMFA(userId)
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.detail || 'MFA setup failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  verifyMFA: async (userId, totpCode) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.verifyMFA(userId, totpCode)
      set({ error: null })
    } catch (error: any) {
      const message = error.response?.data?.detail || 'MFA verification failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  loadUser: async () => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('user_email')
      if (email) {
        set({
          user: {
            id: 'user-' + Math.random().toString(36).substr(2, 9),
            email,
            mfa_enabled: false,
            created_at: new Date().toISOString(),
          },
        })
      }
    }
  },
}))
