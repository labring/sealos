/** @type {import('next').NextConfig} */
const path = require('path')
const runtimeCaching = require('next-pwa/cache')
const isProduction = process.env.NODE_ENV === 'production'
const { i18n } = require('./next-i18next.config')

const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching,
  disable: !isProduction
})


const nextConfig = withPWA({
  i18n,
  reactStrictMode: false,
  swcMinify: isProduction,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../')
  }
})

module.exports = nextConfig
