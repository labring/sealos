/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../')
  },
  async rewrites() {
    return [
      {
        source: '/healthz',
        destination: '/api/healthz',
        locale: false
      }
    ];
  }
};

module.exports = nextConfig;
