/** @type {import('next').NextConfig} */
const runtimeCaching = require('next-pwa/cache')
const isProduction = process.env.NODE_ENV === 'production'

const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching,
  disable: !isProduction
})


const nextConfig = withPWA({
  reactStrictMode: false,
  swcMinify: isProduction,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true
  }
})

module.exports = nextConfig
