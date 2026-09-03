import axios, { AxiosError, AxiosInstance } from 'axios'
import { getNeonToken } from './auth-store'

export function getApiErrorMessage(error: unknown, fallback = 'The security service is unavailable. Please try again.') {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    if (typeof data === 'string' && data.trim()) {
      const clean = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean
    }
    if (data && typeof data === 'object') {
      const detail = (data as { detail?: unknown; message?: unknown }).detail ?? (data as { message?: unknown }).message
      if (typeof detail === 'string' && detail.trim()) return detail
    }
    if (error.message && !error.message.toLowerCase().includes('network error')) return error.message
  }
  return fallback
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || ''

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL.replace(/\/$/, ''),
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Attach JWT Bearer token to all requests
    this.client.interceptors.request.use(async (config) => {
      if (typeof window !== 'undefined') {
        try {
          const token = await getNeonToken()
          if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch {
          // Public requests proceed without token
        }
      }
      return config
    })

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error instanceof AxiosError) {
          error.message = getApiErrorMessage(error)
        }
        return Promise.reject(error)
      }
    )
  }

  private normalizeUrl(url: string): string {
    if (!url.startsWith('/')) {
      url = `/${url}`
    }
    if (!url.startsWith('/api/') && !url.startsWith('/openapi.json')) {
      return `/api${url}`
    }
    return url
  }

  async get<T = any>(url: string, config?: Parameters<AxiosInstance['get']>[1]) {
    return this.client.get<T>(this.normalizeUrl(url), config)
  }

  async post<T = any>(url: string, data?: unknown, config?: Parameters<AxiosInstance['post']>[2]) {
    return this.client.post<T>(this.normalizeUrl(url), data, config)
  }

  async put<T = any>(url: string, data?: unknown, config?: Parameters<AxiosInstance['put']>[2]) {
    return this.client.put<T>(this.normalizeUrl(url), data, config)
  }

  async delete<T = any>(url: string, config?: Parameters<AxiosInstance['delete']>[1]) {
    return this.client.delete<T>(this.normalizeUrl(url), config)
  }

  // ============================================================
  // Authentication & Secret PIN
  // ============================================================

  async register(email: string, password: string, secretPin: string, name?: string) {
    return this.client.post('/api/auth/register', {
      email,
      password,
      secret_pin: secretPin,
      name,
    })
  }

  async login(email: string, password: string, secretPin?: string, totpCode?: string, deviceInfo?: any) {
    return this.client.post('/api/auth/login', {
      email,
      password,
      secret_pin: secretPin,
      totp_code: totpCode,
      device_info: deviceInfo,
    })
  }

  async verifyPin(challengeToken: string, secretPin: string) {
    return this.client.post('/api/auth/verify-pin', {
      challenge_token: challengeToken,
      secret_pin: secretPin,
    })
  }

  async setupPin(currentPassword: string, newSecretPin: string) {
    return this.client.post('/api/auth/pin/setup', {
      current_password: currentPassword,
      new_secret_pin: newSecretPin,
    })
  }

  async getCurrentUser() {
    return this.client.get('/api/auth/me')
  }

  async logout() {
    return this.client.post('/api/auth/logout')
  }

  async forgotPassword(email: string) {
    return this.client.post('/api/auth/forgot-password', { email })
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    return this.client.post('/api/auth/reset-password', { email, token, new_password: newPassword })
  }

  // ============================================================
  // Continuous Behavioral Telemetry & Step-Up
  // ============================================================

  async sendContinuousTelemetry(sessionId: number, telemetry: any, deviceInfo?: any, locationInfo?: any) {
    return this.client.post('/api/continuous/events', {
      session_id: sessionId,
      telemetry,
      device_info: deviceInfo,
      location_info: locationInfo,
    })
  }

  async submitStepUpVerification(sessionId: number, secretPin?: string, totpCode?: string) {
    return this.client.post('/api/continuous/step-up', {
      session_id: sessionId,
      secret_pin: secretPin,
      totp_code: totpCode,
    })
  }

  async completeContinuousStepUp(sessionId: number, secretPin?: string) {
    return this.submitStepUpVerification(sessionId, secretPin)
  }

  async getContinuousStatus(sessionId?: number) {
    const query = sessionId ? `?session_id=${sessionId}` : ''
    return this.client.get(`/api/continuous/status${query}`)
  }

  async getTrustScore(userId: string) {
    return this.client.get(`/api/trust/score/${userId}`)
  }

  // ============================================================
  // Dashboard & Admin Telemetry
  // ============================================================

  async getDashboardSummary() {
    return this.client.get('/api/dashboard/summary')
  }

  async getAdminSummary() {
    return this.client.get('/api/admin/metrics/summary')
  }

  async getMetricsSummary(...args: any[]) {
    return this.getAdminSummary()
  }

  async getAdminAuthStats() {
    return this.client.get('/api/admin/metrics/auth-stats')
  }

  async getAuthStats(...args: any[]) {
    return this.getAdminAuthStats()
  }

  async getAdminTimeseries() {
    return this.client.get('/api/admin/metrics/timeseries')
  }

  async getTimeseriesData(...args: any[]) {
    return this.getAdminTimeseries()
  }

  async getRPS(...args: any[]) {
    return this.getAdminSummary()
  }

  async exportMetricsCSV(...args: any[]) {
    return this.client.get('/api/admin/metrics/summary')
  }

  async getAdminUsers() {
    return this.client.get('/api/admin/users')
  }

  async getAdminSessions() {
    return this.client.get('/api/admin/sessions')
  }

  async getAuditLogs(userId?: string, limit: number = 50) {
    const url = userId ? `/api/audit/logs/${userId}?limit=${limit}` : `/api/audit/logs?limit=${limit}`
    return this.client.get(url)
  }

  // ============================================================
  // Explainable AI (XAI)
  // ============================================================

  async explainDecision(data: { decision?: string; risk_score?: number; trust_score?: number; features?: any; user_id?: string }) {
    return this.client.post('/api/explainability/decision', data)
  }

  async getFeatureImportance(features: any, riskScore: number = 50) {
    return this.client.post('/api/explainability/feature-importance', { features, risk_score: riskScore })
  }

  // ============================================================
  // Federated Learning (Simulation)
  // ============================================================

  async triggerFederatedRound() {
    return this.client.post('/api/federated/rounds/simulation/run')
  }

  async getFederatedHistory(limit: number = 10) {
    return this.client.get(`/api/federated/rounds/history?limit=${limit}`)
  }

  async getFederatedModels(limit: number = 10) {
    return this.client.get(`/api/federated/models?limit=${limit}`)
  }

  // ============================================================
  // Hybrid Cloud Security & Gateway
  // ============================================================

  async getCloudTopology() {
    return this.client.get('/api/cloud/topology')
  }

  async getActiveClouds(cloudType?: string) {
    const query = cloudType ? `?cloud_type=${cloudType}` : ''
    return this.client.get(`/api/cloud/active${query}`)
  }

  async getCloudHealth(cloudId: number) {
    return this.client.get(`/api/cloud/${cloudId}/health`)
  }

  async verifyCloudResourceAccess(resourceId: string, resourceCloud: string = 'public', sessionId?: number) {
    return this.client.post('/api/cloud/verify-access', {
      resource_id: resourceId,
      resource_cloud: resourceCloud,
      session_id: sessionId,
    })
  }

  async triggerCloudFailover(cloudType: string) {
    return this.client.post(`/api/cloud/${cloudType}/failover`, {})
  }

  // ============================================================
  // Zero Trust Policies
  // ============================================================

  async getActivePolicies() {
    return this.client.get('/api/policies/active')
  }

  async getPolicyDetails(policyId: string | number) {
    return this.client.get('/api/policies/active')
  }

  async createPolicy(name: string, description: string, policyType: string = 'adaptive_mfa', priority: number = 10) {
    return this.client.post('/api/policies', {
      name,
      description,
      policy_type: policyType,
      priority,
    })
  }

  // ============================================================
  // Research Evaluation & Academic Benchmarks
  // ============================================================

  async getResearchMetrics() {
    return this.client.get('/api/research/metrics/latest')
  }

  async getThreatSummary() {
    return this.client.get('/api/research/threats/summary')
  }

  async getBaselineComparisonReport() {
    return this.client.get('/api/research/baseline-comparison/report')
  }

  async getResearchReport(hours?: number) {
    return this.getBaselineComparisonReport()
  }

  async getReports(hours?: number) {
    return this.getResearchMetrics()
  }

  async getReportSchedules() {
    return this.client.get('/api/admin/metrics/summary')
  }

  async getOpenApiSpec() {
    return this.client.get('/openapi.json')
  }

  async getComplianceScore() {
    return this.client.get('/api/research/compliance-score')
  }
}

export const apiClient = new APIClient()
export default apiClient
