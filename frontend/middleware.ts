import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ['/admin', '/dashboard', '/policies', '/federated', '/cloud', '/research']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // The current auth flow stores bearer tokens in the browser, which is not
    // available to middleware. Leave the route accessible so the client-side
    // guards can validate the session without redirect loops.
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/policies/:path*', '/federated/:path*', '/cloud/:path*', '/research/:path*']
}
