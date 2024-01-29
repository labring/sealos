const path = require('path');
const { i18n } = require('./next-i18next.config');
const ContentSecurityPolicy = `
  connect-src 'self' https://checkout.stripe.com;
  frame-src 'self' https://js.stripe.com;
  script-src 'self' https://js.stripe.com 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  font-src 'self';
`;
// https://checkout.stripe.com
/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: false,
  output: 'standalone',
  transpilePackages: ['echarts', 'sealos@ui'],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../')
  },
  async headers() {
    console.log(ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim());
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
          }
        ]
      },
      {
        source: '/cost_overview',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
          }
        ]
      }
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/cost_overview',
        permanent: true
      }
    ];
  }
};

module.exports = nextConfig;
