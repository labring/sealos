/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');
const path = require('path');

const nextConfig = {
  i18n,
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  transpilePackages: [
    '@labring/sealos-ui',
    '@labring/sealos-desktop-sdk',
    '@labring/sealos-driver-sdk'
  ],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
};

module.exports = nextConfig;
