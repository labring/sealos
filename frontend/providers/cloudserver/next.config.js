/** @type {import('next').NextConfig} */
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { i18n } = require('./next-i18next.config');
const analyzer = process.env === 'production' ? [new BundleAnalyzerPlugin()] : [];
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
    config.plugins = [...config.plugins, ...analyzer];
    return config;
  },
  transpilePackages: ['@sealos/ui', 'sealos-desktop-sdk', '@sealos/driver'],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
};

module.exports = nextConfig;
