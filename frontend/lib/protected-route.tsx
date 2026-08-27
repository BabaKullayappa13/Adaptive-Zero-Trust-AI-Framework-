'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from './auth-store'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, accessToken, isInitialized, loadUser } = useAuthStore()

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    if (isInitialized && (!accessToken || !user)) {
      router.replace('/auth/login')
    }
  }, [user, accessToken, isInitialized, router])

  if (!isInitialized || !accessToken || !user) {
    return <div className="flex items-center justify-center h-screen">Checking session...</div>
  }

  return <>{children}</>
}
