/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  // Disable image optimization for Azure deployment
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
