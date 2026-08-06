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
}

export const apiClient = new APIClient()
