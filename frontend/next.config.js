// @ts-check
const runtimeCaching = require('next-pwa/cache')
const isProduction = process.env.NODE_ENV === 'production'

const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching,
  disable: !isProduction
})

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = withPWA({
  reactStrictMode: false,
  swcMinify: isProduction,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.*.com'
      }
    ]
  },
  webpack (config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack']
    })

    return config
  },
  images: {
    domains: ['avatars.githubusercontent.com']
  },
  experimental: {
    newNextLinkBehavior: true
    // fallbackNodePolyfills: false
  },
  typescript: {
    ignoreBuildErrors: true
  }
})

module.exports = nextConfig
