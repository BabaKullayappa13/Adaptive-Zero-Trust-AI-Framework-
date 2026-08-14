import axios, { AxiosInstance } from 'axios'
import { getNeonToken } from './auth-store'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://adaptive-zero-trust-ai-framework-yh2l.onrender.com'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Attach the Neon Auth JWT to requests sent to FastAPI.
    this.client.interceptors.request.use(async (config) => {
      if (typeof window !== 'undefined') {
        try {
          const token = await getNeonToken()

          if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch (error) {
          console.warn('Unable to get Neon Auth token')
        }
      }

      return config
    })

    // Handle unauthorized API requests.
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/auth/')
        ) {
          window.location.href = '/auth/login'
        }

        return Promise.reject(error)
      }
    )
  }

  // Remove an old /api prefix if an existing component passes it.
  private normalizeUrl(url: string): string {
    return url.replace(/^\/api(?=\/|$)/, '')
  }

  async get<T = any>(
    url: string,
    config?: Parameters<AxiosInstance['get']>[1]
  ) {
    return this.client.get<T>(this.normalizeUrl(url), config)
  }

  async post<T = any>(
    url: string,
    data?: unknown,
    config?: Parameters<AxiosInstance['post']>[2]
  ) {
    return this.client.post<T>(
      this.normalizeUrl(url),
      data,
      config
    )
  }

  async put<T = any>(
    url: string,
    data?: unknown,
    config?: Parameters<AxiosInstance['put']>[2]
  ) {
    return this.client.put<T>(
      this.normalizeUrl(url),
      data,
      config
    )
  }

  async patch<T = any>(
    url: string,
    data?: unknown,
    config?: Parameters<AxiosInstance['patch']>[2]
  ) {
    return this.client.patch<T>(
      this.normalizeUrl(url),
      data,
      config
    )
  }

  async delete<T = any>(
    url: string,
    config?: Parameters<AxiosInstance['delete']>[1]
  ) {
    return this.client.delete<T>(
      this.normalizeUrl(url),
      config
    )
  }

  // ============================================================
  // Authentication API
  // ============================================================

  async register(email: string, password: string, name?: string) {
    return this.client.post('/auth/register', {
      email,
      password,
      name,
    })
  }

  async login(
    email: string,
    password: string,
    totpCode?: string
  ) {
    return this.client.post('/auth/login', {
      email,
      password,
      ...(totpCode ? { totp_code: totpCode } : {}),
    })
  }

  async getCurrentUser() {
    return this.client.get('/auth/me')
  }

  async logout() {
    return this.client.post('/auth/logout')
  }

  async forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', {
      email,
    })
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string
  ) {
    return this.client.post('/auth/reset-password', {
      email,
      token,
      new_password: newPassword,
    })
  }

  // ============================================================
  // Dashboard
  // ============================================================

  async getDashboardSummary() {
    return this.client.get('/dashboard/summary')
  }

  // ============================================================
  // Trust Score
  // ============================================================

  async getTrustScore(userId: string) {
    return this.client.get(`/trust/score/${userId}`)
  }

  // ============================================================
  // Risk Detection
  // ============================================================

  async detectRisk(
    userId: string,
    sessionData: Record<string, any>
  ) {
    return this.client.post('/risk/detect', {
      user_id: userId,
      session_data: sessionData,
    })
  }

  // ============================================================
  // Continuous Authentication
  // ============================================================

  async getContinuousStatus() {
    return this.client.get('/continuous/status')
  }

  async submitBehaviorEvent(
    features: Record<string, unknown>,
    sessionId?: number
  ) {
    return this.client.post('/continuous/events', {
      features,
      ...(sessionId ? { session_id: sessionId } : {}),
    })
  }

  async completeContinuousStepUp(
    sessionId: number,
    totpCode: string
  ) {
    return this.client.post('/continuous/step-up', {
      session_id: sessionId,
      totp_code: totpCode,
    })
  }

  // ============================================================
  // Audit Logs
  // ============================================================

  async getAuditLogs(
    userId: string,
    limit: number = 50
  ) {
    return this.client.get(`/audit/logs/${userId}`, {
      params: { limit },
    })
  }

  // ============================================================
  // Health
  // ============================================================

  async healthCheck() {
    return this.client.get('/health')
  }

  // ============================================================
  // Admin Metrics
  // ============================================================

  async getMetricsSummary(hours: number = 24) {
    return this.client.get(
      `/admin/metrics/summary?hours=${hours}`
    )
  }

  async getAuthStats(hours: number = 24) {
    return this.client.get(
      `/admin/metrics/auth-stats?hours=${hours}`
    )
  }

  async getTimeseriesData(
    metricType: string,
    hours: number = 24
  ) {
    return this.client.get(
      `/admin/metrics/timeseries?metric_type=${metricType}&hours=${hours}`
    )
  }

  async getRPS(hours: number = 1) {
    return this.client.get(
      `/admin/metrics/rps?hours=${hours}`
    )
  }

  async exportMetricsCSV(
    metricType: string = 'http_request',
    hours: number = 24
  ) {
    return this.client.post(
      '/admin/metrics/export/csv',
      undefined,
      {
        params: {
          metric_type: metricType,
          hours,
        },
      }
    )
  }

  async getResearchReport(hours: number = 24) {
    return this.client.get(
      `/admin/metrics/research-report?hours=${hours}`
    )
  }

  // ============================================================
  // Explainability
  // ============================================================

  async explainDecision(
    payload: Record<string, unknown>
  ) {
    return this.client.post(
      '/explainability/decision',
      payload
    )
  }

  async explainFeatureImportance(
    payload: Record<string, unknown>
  ) {
    return this.client.post(
      '/explainability/feature-importance',
      payload
    )
  }

  async analyzeRiskFactors(
    payload: Record<string, unknown>
  ) {
    return this.client.post(
      '/explainability/risk-factors',
      payload
    )
  }

  async explainWhatIf(
    payload: Record<string, unknown>
  ) {
    return this.client.post(
      '/explainability/what-if',
      payload
    )
  }

  // ============================================================
  // Policies
  // ============================================================

  async getActivePolicies() {
    return this.client.get('/policies/active')
  }

  async getPolicyDetails(policyId: number) {
    return this.client.get(`/policies/${policyId}`)
  }

  // ============================================================
  // Reports
  // ============================================================

  async getReports(
    reportType?: string,
    days: number = 30
  ) {
    return this.client.get('/reports', {
      params: {
        report_type: reportType,
        days,
      },
    })
  }

  async getReportSchedules() {
    return this.client.get('/reports/schedules')
  }

  async generateDailySummary(reportDate?: string) {
    return this.client.post(
      '/reports/daily-summary',
      undefined,
      {
        params: {
          report_date: reportDate,
        },
      }
    )
  }

  // ============================================================
  // Documentation
  // ============================================================

  async getOpenApiSpec() {
    return this.client.get('/documentation/openapi')
  }

  async getArchitecture() {
    return this.client.get('/documentation/architecture')
  }

  async getErDiagram() {
    return this.client.get('/documentation/er-diagram')
  }

  async getDeploymentGuide() {
    return this.client.get('/documentation/deployment')
  }

  async getApiReference() {
    return this.client.get('/documentation/reference')
  }
}

export const apiClient = new APIClient()
