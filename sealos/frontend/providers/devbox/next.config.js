/** @type {import('next').NextConfig} */
const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  webpack: (config, { isServer }) => {
    config.module.rules = config.module.rules.concat([
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack'] // svg to react component
      }
    ]);
    config.plugins = [...config.plugins];
    return config;
  },
  // https://www.npmjs.com/package/geist
  transpilePackages: ['@sealos/ui', 'sealos-desktop-sdk', '@sealos/driver', 'geist'],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
};

module.exports = withNextIntl(nextConfig);
