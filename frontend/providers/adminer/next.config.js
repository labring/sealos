/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  // webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
  //   config.externals.push({
  //     'utf-8-validate': 'commonjs utf-8-validate',
  //     'bufferutil': 'commonjs bufferutil',
  //   })
  //   return config
  // },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
};

module.exports = nextConfig;
