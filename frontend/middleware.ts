import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ['/admin', '/dashboard', '/policies', '/federated', '/cloud', '/research']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check if token exists in cookies
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      // Redirect to login if no token
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/policies/:path*', '/federated/:path*', '/cloud/:path*', '/research/:path*']
}
