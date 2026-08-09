/** @type {import('next').NextConfig} */
const frontendHost = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || ""
const configuredBackendUrls = [
  process.env.BACKEND_API_URL,
  process.env.BACKEND_API_URL_4,
  process.env.BACKEND_API_URL_3,
  process.env.BACKEND_API_URL_2_2,
  process.env.BACKEND_API_URL_2,
]

function isUsableBackendUrl(value) {
  if (!value) return false
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    if (url.hostname === 'localhost' && process.env.NODE_ENV !== 'development') return false
    if (url.hostname.includes('example.com') || url.hostname === frontendHost) return false
    return true
  } catch {
    return false
  }
}

const backendApiUrl = configuredBackendUrls.find(isUsableBackendUrl) || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : null)

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; font-src 'self' data: https:; frame-ancestors 'self'" },
        ],
      },
    ]
  },
  async rewrites() {
    if (!backendApiUrl) {
      return []
    }

    return {
      // Let local Next.js route handlers (such as /api/admin/login) resolve
      // before proxying the remaining API surface to FastAPI.
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${backendApiUrl}/api/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
