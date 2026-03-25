/** @type {import('next').NextConfig} */

const path = require('path')

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  transpilePackages: [
    '@sealos/ui',
    '@labring/sealos-desktop-sdk',
    '@sealos/driver',
    '@sealos/shared',
  ],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  async rewrites() {
    return [
      {
        source: '/api/v2alpha/docs',
        destination: '/api/v2alpha/doc',
      },
      {
        source: '/api/v2alpha/openapi.json',
        destination: '/api/v2alpha/openapi',
      },
    ]
  },
}

module.exports = nextConfig
