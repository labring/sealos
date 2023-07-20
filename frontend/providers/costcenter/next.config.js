const { i18n } = require('./next-i18next.config');
const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: false,
  output: 'standalone',
  transpilePackages: ['echarts'],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }
};

module.exports = nextConfig;
