'use client'

import { apiClient } from './api'

export interface BehavioralTelemetry {
  keystroke_speed: number // chars/sec
  keystroke_variance: number
  mouse_speed: number // px/sec
  mouse_distance: number // px
  click_count: number
  scroll_count: number
  idle_seconds: number
  session_duration_minutes: number
}

export interface ContinuousAuthCallback {
  onScoreUpdate?: (data: { trust_score: number; risk_score: number; confidence_score: number; trust_level: string; risk_level: string }) => void
  onStepUpRequired?: (details: { reason: string; risk_score: number }) => void
  onSessionTerminated?: (details: { reason: string }) => void
}

export class ContinuousBehaviorCollector {
  private sessionId: number | null = null
  private callbacks: ContinuousAuthCallback = {}
  private isCollecting = false
  private intervalTimer: any = null

  // Telemetry buffer
  private mouseMovements: { x: number; y: number; time: number }[] = []
  private totalMouseDistance = 0
  private lastMousePos = { x: 0, y: 0, time: Date.now() }
  private clickCount = 0
  private scrollCount = 0
  private keyPressTimes: number[] = []
  private lastActivityTime = Date.now()
  private sessionStartTime = Date.now()

  constructor() {}

  public start(sessionId: number, callbacks: ContinuousAuthCallback = {}) {
    if (typeof window === 'undefined') return
    this.sessionId = sessionId
    this.callbacks = callbacks
    this.sessionStartTime = Date.now()
    this.lastActivityTime = Date.now()
    this.isCollecting = true

    this.attachEventListeners()

    // Send behavioral telemetry packet every 15 seconds
    if (this.intervalTimer) clearInterval(this.intervalTimer)
    this.intervalTimer = setInterval(() => {
      void this.flushAndSendTelemetry()
    }, 15000)
  }

  public stop() {
    this.isCollecting = false
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = null
    }
    this.detachEventListeners()
  }

  private attachEventListeners() {
    if (typeof window === 'undefined') return
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true })
    window.addEventListener('click', this.handleClick, { passive: true })
    window.addEventListener('keydown', this.handleKeyDown, { passive: true })
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  }

  private detachEventListeners() {
    if (typeof window === 'undefined') return
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('click', this.handleClick)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('scroll', this.handleScroll)
  }

  private handleMouseMove = (e: MouseEvent) => {
    const now = Date.now()
    const dt = (now - this.lastMousePos.time) / 1000.0
    if (dt > 0.05) {
      const dx = e.clientX - this.lastMousePos.x
      const dy = e.clientY - this.lastMousePos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      this.totalMouseDistance += dist
      this.mouseMovements.push({ x: e.clientX, y: e.clientY, time: now })
      if (this.mouseMovements.length > 50) this.mouseMovements.shift()
      this.lastMousePos = { x: e.clientX, y: e.clientY, time: now }
      this.lastActivityTime = now
    }
  }

  private handleClick = () => {
    this.clickCount++
    this.lastActivityTime = Date.now()
  }

  private handleKeyDown = () => {
    const now = Date.now()
    this.keyPressTimes.push(now)
    if (this.keyPressTimes.length > 30) this.keyPressTimes.shift()
    this.lastActivityTime = now
  }

  private handleScroll = () => {
    this.scrollCount++
    this.lastActivityTime = Date.now()
  }

  public async flushAndSendTelemetry() {
    if (!this.isCollecting || !this.sessionId) return

    const now = Date.now()
    const idleSeconds = Math.floor((now - this.lastActivityTime) / 1000.0)
    const sessionDurationMins = Math.max(0.1, (now - this.sessionStartTime) / 60000.0)

    // Calculate mouse speed
    const mouseSpeed = this.totalMouseDistance > 0 ? (this.totalMouseDistance / 15.0) : 0.0

    // Calculate keystroke speed & variance
    let keystrokeSpeed = 0.0
    let keystrokeVariance = 0.0
    if (this.keyPressTimes.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < this.keyPressTimes.length; i++) {
        intervals.push((this.keyPressTimes[i] - this.keyPressTimes[i - 1]) / 1000.0)
      }
      const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      keystrokeSpeed = meanInterval > 0 ? (1.0 / meanInterval) : 0.0
      keystrokeVariance = intervals.reduce((acc, val) => acc + Math.pow(val - meanInterval, 2), 0) / intervals.length
    }

    const telemetry: BehavioralTelemetry = {
      keystroke_speed: Math.min(15.0, Number(keystrokeSpeed.toFixed(2))),
      keystroke_variance: Number(keystrokeVariance.toFixed(4)),
      mouse_speed: Math.min(2000.0, Number(mouseSpeed.toFixed(1))),
      mouse_distance: Math.min(5000.0, Number(this.totalMouseDistance.toFixed(1))),
      click_count: this.clickCount,
      scroll_count: this.scrollCount,
      idle_seconds: idleSeconds,
      session_duration_minutes: Number(sessionDurationMins.toFixed(1)),
    }

    // Reset periodic counters
    this.totalMouseDistance = 0
    this.clickCount = 0
    this.scrollCount = 0
    this.keyPressTimes = []

    const deviceInfo = {
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
    }

    const locationInfo = {
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194,
      vpn_detected: false,
    }

    try {
      const res = await apiClient.sendContinuousTelemetry(this.sessionId, telemetry, deviceInfo, locationInfo)
      const data = res.data

      if (this.callbacks.onScoreUpdate) {
        this.callbacks.onScoreUpdate({
          trust_score: data.trust_score,
          risk_score: data.risk_score,
          confidence_score: data.confidence_score,
          trust_level: data.trust_level,
          risk_level: data.risk_level,
        })
      }

      if (data.session_terminated && this.callbacks.onSessionTerminated) {
        this.callbacks.onSessionTerminated({ reason: 'Critical risk exceeded threshold. Session terminated.' })
      } else if (data.step_up_required && this.callbacks.onStepUpRequired) {
        this.callbacks.onStepUpRequired({
          reason: 'Behavioral anomaly or contextual deviation detected. Verification required.',
          risk_score: data.risk_score,
        })
      }
    } catch (err) {
      console.warn('[ContinuousAuth] Telemetry delivery issue:', err)
    }
  }
}

export const continuousCollector = new ContinuousBehaviorCollector()
