const { sources } = require('next/dist/compiled/webpack/webpack');
const path = require('path');
const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = require('next/constants');
const { i18n } = require('./next-i18next.config');

// module.exports = nextConfig;
module.exports = (phase, { defaultConfig }) => {
  /**
   * @type {import('next').NextConfig}
   */
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      reactStrictMode: true,
      i18n,
      experimental: {
        outputFileTracingRoot: path.join(__dirname, '../../')
      },
      async headers() {
        return [
          {
            source: '/:path*',
            headers: [
              {
                key: 'Access-Control-Allow-Origin',
                value: 'http://localhost:3001'
              },
              {
                key: 'Access-Control-Allow-Methods',
                value: 'GET, POST, PUT, DELETE, OPTIONS'
              },
              {
                key: 'Access-Control-Allow-Headers',
                value: 'Content-Type'
              },
              {
                key: 'Content-Security-Policy',
                value:
                  "default-src * blob: data: *; img-src * data: blob: resource: *; connect-src * wss: blob: resource:; style-src 'self' 'unsafe-inline' blob: * resource:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: * resource: *.baidu.com *.bdstatic.com; frame-src 'self' * mailto: tel: weixin: mtt: *.baidu.com; frame-ancestors 'self' *;upgrade-insecure-requests"
              }
            ]
          }
        ];
      },
      transpilePackages: ['@sealos/ui', 'sealos-desktop-sdk']
    };
    return nextConfig;
  } else
    return {
      i18n,
      experimental: {
        outputFileTracingRoot: path.join(__dirname, '../../')
      },
      output: 'standalone',
      transpilePackages: ['@sealos/ui', 'sealos-desktop-sdk']
    };
};
