/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  transpilePackages: ['monaco-editor'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Opt into Turbopack explicitly.
  turbopack: {}
};

module.exports = nextConfig;
