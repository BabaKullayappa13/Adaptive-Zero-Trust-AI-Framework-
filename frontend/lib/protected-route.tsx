'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from './auth-store'

export function ProtectedRoute({ 
  children, 
  requiredRole = 'user' 
}: { 
  children: ReactNode
  requiredRole?: 'admin' | 'user' | 'analyst'
}) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()

  useEffect(() => {
    if (!accessToken || !user) {
      router.push('/auth/login')
      return
    }

    if (requiredRole === 'admin' && user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    if (requiredRole === 'analyst' && !['admin', 'analyst'].includes(user.role)) {
      router.push('/dashboard')
      return
    }
  }, [user, accessToken, requiredRole, router])

  if (!accessToken || !user) {
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <div className="flex items-center justify-center h-screen">Access Denied</div>
  }

  return <>{children}</>
}
