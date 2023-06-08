const { i18n } = require('./next-i18next.config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: false,
  output: 'standalone',
  transpilePackages: ["echarts"],
}

module.exports = nextConfig
