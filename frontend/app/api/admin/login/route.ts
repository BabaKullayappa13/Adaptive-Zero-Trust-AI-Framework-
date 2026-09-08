import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

const SESSION_TTL_SECONDS = 60 * 60 * 8

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.SECRET_KEY_3 || process.env.ADMIN_ACCESS_KEY_4
}

function signature(value: string) {
  const secret = getSessionSecret()
  return secret ? createHmac('sha256', secret).update(value).digest('hex') : null
}

export async function POST(request: Request) {
  const configuredKey = (process.env.ADMIN_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY_4)?.trim()
  if (!configuredKey || !getSessionSecret()) {
    console.error('[v0] Admin authentication is not configured on the server')
    return NextResponse.json({ detail: 'Admin authentication is not configured on the server.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const providedKey = typeof body?.key === 'string' ? body.key.trim() : ''
  if (!providedKey) return NextResponse.json({ detail: 'Secure access key is required' }, { status: 400 })

  const expected = Buffer.from(configuredKey)
  const received = Buffer.from(providedKey)
  const valid = expected.length === received.length && timingSafeEqual(expected, received)
  if (!valid) return NextResponse.json({ detail: 'Invalid admin key' }, { status: 401 })

  const issuedAt = Math.floor(Date.now() / 1000).toString()
  const sig = signature(issuedAt)
  const value = sig ? `${issuedAt}.${sig}` : ''

  // Attempt to obtain token from FastAPI backend if available
  let adminToken: string | null = null
  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
  try {
    const backendResp = await fetch(`${backendUrl.replace(/\/$/, '')}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: providedKey }),
      cache: 'no-store',
    })
    if (backendResp.ok) {
      const data = await backendResp.json().catch(() => null)
      if (data?.access_token) {
        adminToken = data.access_token
      }
    }
  } catch {
    // Local session fallback succeeds even if direct backend call had transient failure
  }

  const response = NextResponse.json(
    { ok: true, authenticated: true, role: 'admin', access_token: adminToken },
    { headers: { 'Cache-Control': 'no-store' } }
  )

  if (value) {
    response.cookies.set('admin_session', value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })
  }

  if (adminToken) {
    response.cookies.set('admin_token', adminToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })
  }

  return response
}

