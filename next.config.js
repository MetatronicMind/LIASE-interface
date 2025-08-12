/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for Azure deployment
  images: {
    unoptimized: true
  },
  // Ensure proper asset handling
  assetPrefix: '',
  // Disable x-powered-by header
  poweredByHeader: false,
  // Enable React strict mode
  reactStrictMode: true
}

module.exports = nextConfig
