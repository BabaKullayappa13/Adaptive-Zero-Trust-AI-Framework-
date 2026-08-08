import { NextRequest, NextResponse } from 'next/server'

const SESSION_TTL_SECONDS = 60 * 60 * 8

async function validAdminSession(value: string | undefined) {
  if (!value) return false
  const [issuedAt, providedSignature] = value.split('.')
  const timestamp = Number(issuedAt)
  if (!Number.isFinite(timestamp) || Math.floor(Date.now() / 1000) - timestamp > SESSION_TTL_SECONDS || !providedSignature) return false
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SECRET_KEY_3 || process.env.ADMIN_ACCESS_KEY_4
  if (!secret) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const signatureBytes = new Uint8Array(providedSignature.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [])
  return crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(issuedAt))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const protectedPage = pathname.startsWith('/admin') && pathname !== '/admin/login'
  const protectedApi = pathname.startsWith('/api/admin') && !pathname.endsWith('/login')
  const valid = await validAdminSession(request.cookies.get('admin_session')?.value)

  if ((protectedPage || protectedApi) && !valid) {
    if (protectedApi) {
      return NextResponse.json({ detail: 'Admin authentication required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const response = NextResponse.next()
  if (protectedPage || protectedApi) response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }
