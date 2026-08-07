import axios, { AxiosInstance } from 'axios'

const API_BASE = '/api'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Handle token expiration and refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired - attempt refresh
          if (typeof window !== 'undefined') {
            const refreshToken = localStorage.getItem('refresh_token')
            if (refreshToken) {
              try {
                const requestConfig = error.config as typeof error.config & { _retry?: boolean }
                if (requestConfig?._retry) {
                  return Promise.reject(error)
                }
                requestConfig._retry = true
                const response = await this.client.post('/auth/refresh', { refresh_token: refreshToken })
                const { access_token, refresh_token: nextRefreshToken } = response.data
                localStorage.setItem('access_token', access_token)
                if (nextRefreshToken) localStorage.setItem('refresh_token', nextRefreshToken)
                if (error.config) {
                  error.config.headers = error.config.headers ?? {}
                  error.config.headers.Authorization = `Bearer ${access_token}`
                  return this.client(error.config)
                }
                return Promise.reject(error)
              } catch (refreshError) {
                // Refresh failed - redirect to login and settle the request.
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                window.location.href = '/auth/login'
                return Promise.reject(refreshError)
              }
            } else {
              window.location.href = '/auth/login'
              return Promise.reject(error)
            }
          }
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T = any>(url: string, config?: Parameters<AxiosInstance['get']>[1]) {
    return this.client.get<T>(url.replace(/^\/api\//, '/'), config)
  }

  async post<T = any>(url: string, data?: unknown, config?: Parameters<AxiosInstance['post']>[2]) {
    return this.client.post<T>(url.replace(/^\/api\//, '/'), data, config)
  }

  async patch<T = any>(url: string, data?: unknown, config?: Parameters<AxiosInstance['patch']>[2]) {
    return this.client.patch<T>(url.replace(/^\/api\//, '/'), data, config)
  }

  async delete<T = any>(url: string, config?: Parameters<AxiosInstance['delete']>[1]) {
    return this.client.delete<T>(url.replace(/^\/api\//, '/'), config)
  }

  // Auth endpoints
  async register(email: string, password: string, name?: string) {
    return this.client.post('/auth/register', { email, password, name })
  }

  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password })
  }

  async getCurrentUser() {
    return this.client.get('/auth/me')
  }

  async logout() {
    return this.client.post('/auth/logout')
  }

  async getDashboardSummary() {
    return this.client.get('/dashboard/summary')
  }

  async setupMFA(userId: string) {
    return this.client.post('/auth/mfa/setup', { user_id: userId })
  }

  async verifyMFA(userId: string, totpCode: string) {
    return this.client.post('/auth/mfa/verify', { user_id: userId, totp_code: totpCode })
  }

  // Trust score endpoints
  async getTrustScore(userId: string) {
    return this.client.get(`/trust/score/${userId}`)
  }

  // Risk detection endpoints
  async detectRisk(userId: string, sessionData: Record<string, any>) {
    return this.client.post('/risk/detect', { user_id: userId, ...sessionData })
  }

  // Audit logs endpoints
  async getAuditLogs(userId: string, limit: number = 50) {
    return this.client.get(`/audit/logs/${userId}`, { params: { limit } })
  }

  // Health check
  async healthCheck() {
    return this.client.get('/health')
  }

  // Admin metrics endpoints
  async getMetricsSummary(hours: number = 24) {
    return this.client.get(`/admin/metrics/summary?hours=${hours}`)
  }

  async getAuthStats(hours: number = 24) {
    return this.client.get(`/admin/metrics/auth-stats?hours=${hours}`)
  }

  async getTimeseriesData(metricType: string, hours: number = 24) {
    return this.client.get(`/admin/metrics/timeseries?metric_type=${metricType}&hours=${hours}`)
  }

  async getRPS(hours: number = 1) {
    return this.client.get(`/admin/metrics/rps?hours=${hours}`)
  }

  async exportMetricsCSV(metricType: string = 'http_request', hours: number = 24) {
    return this.client.get(`/admin/metrics/export/csv?metric_type=${metricType}&hours=${hours}`)
  }

  async getResearchReport(hours: number = 24) {
    return this.client.get(`/admin/metrics/research-report?hours=${hours}`)
  }

  async explainDecision(payload: Record<string, unknown>) {
    return this.client.post('/explainability/decision', payload)
  }

  async explainFeatureImportance(payload: Record<string, unknown>) {
    return this.client.post('/explainability/feature-importance', payload)
  }

  async analyzeRiskFactors(payload: Record<string, unknown>) {
    return this.client.post('/explainability/risk-factors', payload)
  }

  async explainWhatIf(payload: Record<string, unknown>) {
    return this.client.post('/explainability/what-if', payload)
  }

  async getReports(reportType?: string, days: number = 30) {
    return this.client.get('/reports', { params: { report_type: reportType, days } })
  }

  async getReportSchedules() {
    return this.client.get('/reports/schedules')
  }

  async generateDailySummary(reportDate?: string) {
    return this.client.post('/reports/daily-summary', undefined, { params: { report_date: reportDate } })
  }

  async getOpenApiSpec() {
    return this.client.get('/documentation/openapi')
  }

  async getArchitecture() {
    return this.client.get('/documentation/architecture')
  }

  async getErDiagram() {
    return this.client.get('/documentation/er-diagram')
  }
}

export const apiClient = new APIClient()
