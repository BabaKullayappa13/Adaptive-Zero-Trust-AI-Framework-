/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined)

if (!backendApiUrl) {
  throw new Error("BACKEND_API_URL must be configured for production builds")
}

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async rewrites() {
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
