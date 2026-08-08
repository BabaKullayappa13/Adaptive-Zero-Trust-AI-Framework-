/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : null)

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
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
