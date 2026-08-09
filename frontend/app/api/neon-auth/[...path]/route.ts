import { NextRequest, NextResponse } from 'next/server'

const neonAuthBaseUrl = (process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL || '').replace(/\/$/, '')

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!neonAuthBaseUrl) {
    return NextResponse.json({ error: 'Authentication service is not configured' }, { status: 503 })
  }

  const { path } = await context.params
  const target = `${neonAuthBaseUrl}/${path.join('/')}${request.nextUrl.search}`
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('content-length')
  headers.set('accept', 'application/json')

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[v0] Neon Auth proxy failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Authentication service is temporarily unavailable' }, { status: 503 })
  }

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.delete('content-length')
  responseHeaders.set('cache-control', 'no-store')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
