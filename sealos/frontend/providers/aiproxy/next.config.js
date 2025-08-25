/** @type {import('next').NextConfig} */

const path = require('path')

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  transpilePackages: ['@sealos/ui', 'sealos-desktop-sdk', '@sealos/driver'],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
}

module.exports = nextConfig
