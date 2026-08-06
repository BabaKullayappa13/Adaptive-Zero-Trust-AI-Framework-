/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep dev output separate from production builds to prevent stale webpack
  // manifests when preview build and dev processes overlap.
  distDir: ".next-dev",
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: "bottom-right",
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "http://localhost:8000/api/:path*",
        },
      ],
    }
  },
}

export default nextConfig
