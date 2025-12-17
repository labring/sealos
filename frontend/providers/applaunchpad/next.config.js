/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');
const path = require('path');
const nextConfig = {
  i18n,
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  webpack: (config, { isServer }) => {
    config.module.rules = config.module.rules.concat([
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack']
      }
    ]);
    config.plugins = [...config.plugins];
    if (!isServer) {
      config.resolve.fallback = {
        fs: false
      };
    }
    return config;
  },
  transpilePackages: ['@sealos/driver', '@sealos/ui'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
    instrumentationHook: true
  },
  async rewrites() {
    return [
      {
        source: '/api/v2alpha/doc',
        destination: '/doc/v2alpha'
      }
    ];
  }
};

module.exports = nextConfig;
