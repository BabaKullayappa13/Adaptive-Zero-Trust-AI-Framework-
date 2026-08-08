/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : null)

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
        ],
      },
    ]
  },
  async rewrites() {
    if (!backendApiUrl) {
      return []
    }

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendApiUrl}/api/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
