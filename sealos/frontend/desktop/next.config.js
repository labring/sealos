/** @type {import('next').NextConfig} */
const path = require('path');
const runtimeCaching = require('next-pwa/cache');
const isProduction = process.env.NODE_ENV === 'production';
const { i18n } = require('./next-i18next.config');

const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching,
  disable: !isProduction
});

const nextConfig = withPWA({
  i18n,
  reactStrictMode: false,
  async redirects() {
    if (isProduction) {
      return [
        {
          source: '/api/dev/:slug',
          destination: '/',
          permanent: true
        }
      ];
    } else {
      return [];
    }
  },
  swcMinify: isProduction,
  output: 'standalone',
  transpilePackages: ['@sealos/ui', 'sealos-desktop-sdk', '@sealos/driver'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../')
  }
});

module.exports = nextConfig;
