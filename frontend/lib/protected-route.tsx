'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from './auth-store'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace('/auth/login')
    }
  }, [user, accessToken, router])

  if (!accessToken || !user) {
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>
  }

  return <>{children}</>
}
