import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

const SESSION_TTL_SECONDS = 60 * 60 * 8

function signature(value: string) {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET || process.env.SECRET_KEY || 'development-only-secret').update(value).digest('hex')
}

export async function POST(request: Request) {
  const configuredKey = process.env.ADMIN_ACCESS_KEY
  if (!configuredKey) return NextResponse.json({ detail: 'Admin access is not configured' }, { status: 503 })

  const body = await request.json().catch(() => null)
  const providedKey = typeof body?.key === 'string' ? body.key : ''
  const expected = Buffer.from(configuredKey)
  const received = Buffer.from(providedKey)
  const valid = expected.length === received.length && timingSafeEqual(expected, received)
  if (!valid) return NextResponse.json({ detail: 'Invalid admin key' }, { status: 401 })

  const issuedAt = Math.floor(Date.now() / 1000).toString()
  const value = `${issuedAt}.${signature(issuedAt)}`
  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_session', value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  return response
}

