const { i18n } = require('./next-i18next.config')
const isProduction = process.env.NODE_ENV === 'production'


/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: false,
  swcMinify: isProduction,
  output: 'standalone'
}

module.exports = nextConfig
