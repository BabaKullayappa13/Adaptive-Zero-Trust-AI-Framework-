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

    const events = ['pointerdown', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    reset()

    return () => {
      active = false
      window.clearTimeout(timeout)
      events.forEach((event) => window.removeEventListener(event, reset))
    }
  }, [router])

  return null
}
