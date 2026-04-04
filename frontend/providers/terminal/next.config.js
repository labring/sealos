/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  transpilePackages: ['@labring/sealos-shared-sdk', '@labring/sealos-desktop-sdk'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
};

module.exports = nextConfig;
