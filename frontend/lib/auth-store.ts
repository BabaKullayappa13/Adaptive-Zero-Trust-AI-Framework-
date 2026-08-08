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
  isInitialized: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  register: (email: string, password: string, name?: string) => Promise<void>
  login: (email: string, password: string, totpCode?: string) => Promise<void>
  logout: () => Promise<void>
  setupMFA: (userId: string) => Promise<any>
  verifyMFA: (userId: string, totpCode: string) => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user }),
  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken })
    // Tokens should be stored securely - using memory + httpOnly cookies in production
    // sessionStorage is vulnerable to XSS attacks; in production, use httpOnly cookies instead
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('access_token', accessToken)
        sessionStorage.setItem('refresh_token', refreshToken)
      } catch (e) {
        console.warn('[v0] Failed to store tokens in sessionStorage')
      }
    }
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  register: async (email, password, name) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.register(email, password, name)
      // Registration does not authenticate the user. The caller should route
      // to sign-in after the backend confirms the account was created.
      set({ user: null, accessToken: null, refreshToken: null, error: null })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  login: async (email, password, totpCode) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.login(email, password, totpCode)
      const { access_token, refresh_token } = response.data
      set({ accessToken: access_token, refreshToken: refresh_token, isInitialized: true, error: null })
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('access_token', access_token)
        sessionStorage.setItem('refresh_token', refresh_token)
        sessionStorage.setItem('user_email', email)
      }
      const userResponse = await apiClient.getCurrentUser()
      set({ user: userResponse.data })
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await apiClient.logout()
    } catch {
      // Clear local credentials even when the server is unavailable.
    } finally {
      set({ user: null, accessToken: null, refreshToken: null, error: null })
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
        sessionStorage.removeItem('user_email')
      }
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
    if (typeof window === 'undefined') return
    const accessToken = sessionStorage.getItem('access_token')
    const refreshToken = sessionStorage.getItem('refresh_token')
    if (!accessToken) {
      set({ isInitialized: true })
      return
    }
    set({ accessToken, refreshToken })
    try {
      const response = await apiClient.getCurrentUser()
      set({ user: response.data, error: null, isInitialized: true })
    } catch {
      set({ user: null, accessToken: null, refreshToken: null, isInitialized: true })
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
    }
  },
}))
