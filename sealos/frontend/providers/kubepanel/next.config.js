/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  webpack: (config) => {
    config.module.rules = config.module.rules.concat([
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack']
      }
    ]);
    config.plugins = [...config.plugins];
    return config;
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
};

module.exports = nextConfig;
