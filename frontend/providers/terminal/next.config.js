/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  transpilePackages: ['@sealos/shared', 'sealos-desktop-sdk', '@xterm/xterm', '@xterm/addon-fit'],
  productionBrowserSourceMaps: true,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../')
  },
  webpack(config, { dev }) {
    if (!dev) {
      config.optimization.innerGraph = false;
    }
    return config;
  }
};

module.exports = nextConfig;
