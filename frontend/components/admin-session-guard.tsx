'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

export default function AdminSessionGuard() {
  const router = useRouter()

  useEffect(() => {
    let timeout: number | undefined
    let active = true

    const expire = async () => {
      if (!active) return
      await fetch('/api/admin/logout', { method: 'POST', cache: 'no-store' }).catch(() => undefined)
      router.replace('/admin/login?reason=timeout')
    }

    const reset = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(expire, INACTIVITY_TIMEOUT_MS)
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void expire()
      }
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navigation?.type === 'reload') {
      void expire()
      return () => { active = false }
    }

    const events = ['pointerdown', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    window.addEventListener('pageshow', handlePageShow)
    reset()

    return () => {
      active = false
      window.clearTimeout(timeout)
      events.forEach((event) => window.removeEventListener(event, reset))
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [router])

  return null
}
