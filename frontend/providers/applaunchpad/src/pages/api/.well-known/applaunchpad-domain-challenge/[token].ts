import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { jsonRes } from '../../../../services/backend/response';

function detectProxy(req: NextApiRequest): { isProxy: boolean } {
  const headers = req.headers;
  const headerObj: Record<string, string> = {};

  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      headerObj[key.toLowerCase()] = value;
    }
  });

  if (
    headerObj['cf-ray'] ||
    headerObj['cf-cache-status'] ||
    (headerObj['server'] && headerObj['server'].toLowerCase().includes('cloudflare'))
  ) {
    return { isProxy: true };
  }

  const proxyHeaders = [
    'x-served-by', // Fastly
    'x-cache', // Various CDN
    'x-amz-cf-id', // AWS CloudFront
    'x-azure-ref', // Azure CDN
    'x-akamai-edgescape' // Akamai
  ];

  for (const header of proxyHeaders) {
    if (headerObj[header]) {
      return { isProxy: true };
    }
  }

  if (headerObj['server']) {
    const server = headerObj['server'].toLowerCase();
    const proxySignatures = ['nginx/cloudflare', 'varnish', 'squid'];

    for (const signature of proxySignatures) {
      if (server.includes(signature)) {
        return { isProxy: true };
      }
    }
  }

  return { isProxy: false };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, { code: 405, error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;
    const host = req.headers.host;

    if (!token || typeof token !== 'string') {
      return jsonRes(res, { code: 400, error: 'Missing or invalid token parameter' });
    }

    if (!host) {
      return jsonRes(res, { code: 400, error: 'Missing Host header' });
    }

    const proxyInfo = detectProxy(req);

    const secret =
      global.AppConfig?.launchpad?.domainChallengeSecret ||
      'default-dev-secret-change-in-production';

    const timestamp = Math.floor(Date.now() / 1000);
    const service = 'applaunchpad';

    const data = {
      host,
      token,
      timestamp,
      service,
      isProxy: proxyInfo.isProxy
    };

    const signatureData = `${data.host}:${data.token}:${data.timestamp}:${data.service}:${data.isProxy}`;
    const signature = crypto.createHmac('sha256', secret).update(signatureData).digest('hex');

    jsonRes(res, {
      data: {
        signature,
        ...data
      }
    });
  } catch (error) {
    console.error('Domain challenge error:', error);
    jsonRes(res, { code: 500, error: 'Internal server error' });
  }
}
