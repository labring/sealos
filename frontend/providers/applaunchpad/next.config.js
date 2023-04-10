/** @type {import('next').NextConfig} */
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const analyzer = process.env === 'production' ? [new BundleAnalyzerPlugin()] : [];

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  webpack(config) {
    config.module.rules = config.module.rules.concat([
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack']
      }
    ]);
    config.plugins = [...config.plugins, ...analyzer];

    return config;
  }
};

module.exports = nextConfig;
