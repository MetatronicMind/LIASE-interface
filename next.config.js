/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for better compatibility with Azure
  output: 'standalone',
  
  // Optimize for production
  swcMinify: true,
  
  // Configure image optimization for Azure
  images: {
    unoptimized: true,
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Enable compression
  compress: true,
}

module.exports = nextConfig
