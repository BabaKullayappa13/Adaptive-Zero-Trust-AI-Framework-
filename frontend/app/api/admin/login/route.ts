import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

const SESSION_TTL_SECONDS = 60 * 60 * 8

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_ACCESS_KEY ||
    process.env.SECRET_KEY_3 ||
    process.env.ADMIN_ACCESS_KEY_4 ||
    'adaptive-zero-trust-admin-session-secret-2026'
  )
}

function signature(value: string) {
  const secret = getSessionSecret()
  return secret ? createHmac('sha256', secret).update(value).digest('hex') : null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const providedKey = typeof body?.key === 'string' ? body.key.trim() : ''
  if (!providedKey) {
    return NextResponse.json({ detail: 'Secure access key is required' }, { status: 400 })
  }

  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
  let authenticated = false
  let adminToken: string | null = null
  let backendErrorDetail = ''

  // 1. Authoritative Backend Authentication via FastAPI
  try {
    const backendResp = await fetch(`${backendUrl.replace(/\/$/, '')}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ key: providedKey }),
      cache: 'no-store',
    })

    if (backendResp.ok) {
      const data = await backendResp.json().catch(() => null)
      if (data?.authenticated) {
        authenticated = true
        adminToken = data.access_token || null
      }
    } else {
      const errData = await backendResp.json().catch(() => null)
      backendErrorDetail = errData?.detail || 'Invalid admin key'
      if (backendResp.status === 429) {
        return NextResponse.json({ detail: backendErrorDetail }, { status: 429 })
      }
    }
  } catch (backendErr) {
    console.warn('[Admin Login] Backend unreachable, falling back to local verification:', backendErr)
  }

  // 2. Local Fallback Verification if Backend was not reachable
  if (!authenticated) {
    const configuredKey = (process.env.ADMIN_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY_4)?.trim()
    if (configuredKey) {
      const expected = Buffer.from(configuredKey)
      const received = Buffer.from(providedKey)
      if (expected.length === received.length && timingSafeEqual(expected, received)) {
        authenticated = true
      }
    }
  }

  if (!authenticated) {
    return NextResponse.json(
      { detail: backendErrorDetail || 'Invalid admin key' },
      { status: 401 }
    )
  }

  // Generate session cookie
  const issuedAt = Math.floor(Date.now() / 1000).toString()
  const sig = signature(issuedAt)
  const value = sig ? `${issuedAt}.${sig}` : ''

  const response = NextResponse.json(
    { ok: true, authenticated: true, role: 'admin', access_token: adminToken },
    { headers: { 'Cache-Control': 'no-store' } }
  )

  if (value) {
    response.cookies.set('admin_session', value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !process.env.LOCAL_DEV,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })
  }

  if (adminToken) {
    response.cookies.set('admin_token', adminToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production' && !process.env.LOCAL_DEV,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })
  }

  return response
}

