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
      reactStrictMode: false,
      i18n,
      experimental: {
        outputFileTracingRoot: path.join(__dirname, '../../')
      },
      webpack(config, { isServer }) {
        if (!isServer) {
          config.resolve = {
            ...config.resolve,
            fallback: {
              ...config.resolve.fallback,
              fs: false
            }
          };
        }
        Object.assign(config.resolve.alias, {
          'utf-8-validate': false,
          bufferutil: false
        });
        config.module = {
          ...config.module,
          rules: config.module.rules.concat([
            {
              test: /\.svg$/i,
              issuer: /\.[jt]sx?$/,
              use: ['@svgr/webpack']
            }
          ]),
          exprContextCritical: false,
          unknownContextCritical: false
        };

        return config;
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
