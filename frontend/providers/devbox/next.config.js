/** @type {import('next').NextConfig} */
const path = require('path');
const { execSync } = require('child_process');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

const getDevboxCommitHash = () => {
  const configuredHash =
    process.env.NEXT_PUBLIC_DEVBOX_COMMIT_HASH || process.env.DEVBOX_COMMIT_HASH;

  if (configuredHash?.trim()) {
    const normalizedHash = configuredHash.trim();
    return /^[0-9a-f]{12,40}$/i.test(normalizedHash)
      ? normalizedHash.slice(0, 12)
      : normalizedHash;
  }

  try {
    return execSync('git rev-parse --short=12 HEAD', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return 'source-unavailable';
  }
};

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compress: true,
  env: {
    NEXT_PUBLIC_DEVBOX_COMMIT_HASH: getDevboxCommitHash(),
    WS_NO_BUFFER_UTIL: '1',
    WS_NO_UTF_8_VALIDATE: '1'
  },
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
  transpilePackages: [
    '@sealos/ui',
    'sealos-desktop-sdk',
    '@sealos/driver',
    'geist',
    '@sealos/shared'
  ],
  experimental: {
    // this includes files from the monorepo base two directories up
    outputFileTracingRoot: path.join(__dirname, '../../')
  },
  async rewrites() {
    return [
      {
        source: '/api/v2alpha/openapi.json',
        destination: '/api/v2alpha/openapi'
      }
    ];
  }
};

module.exports = withNextIntl(nextConfig);
