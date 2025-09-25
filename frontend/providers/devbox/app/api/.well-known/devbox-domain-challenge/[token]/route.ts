import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { jsonRes } from '../../../../../services/backend/response';

function detectProxy(req: NextRequest): { isProxy: boolean } {
  const headers = req.headers;
  const headerObj: Record<string, string> = {};

  headers.forEach((value, key) => {
    headerObj[key.toLowerCase()] = value;
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

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;
    const host = request.headers.get('host');

    if (!token) {
      return jsonRes({
        code: 400,
        error: 'Missing or invalid token parameter'
      });
    }

    if (!host) {
      return jsonRes({
        code: 400,
        error: 'Missing Host header'
      });
    }

    const proxyInfo = detectProxy(request);

    const secret =
      process.env.DEVBOX_DOMAIN_CHALLENGE_SECRET || 'default-dev-secret-change-in-production';

    const timestamp = Math.floor(Date.now() / 1000);
    const service = 'devbox';

    const data = {
      host,
      token,
      timestamp,
      service,
      isProxy: proxyInfo.isProxy
    };

    const signatureData = `${data.host}:${data.token}:${data.timestamp}:${data.service}:${data.isProxy}`;
    const signature = crypto.createHmac('sha256', secret).update(signatureData).digest('hex');

    return jsonRes({
      data: {
        signature,
        ...data
      }
    });
  } catch (error) {
    console.error('Domain challenge error:', error);
    return jsonRes({
      code: 500,
      error: 'Internal server error'
    });
  }
}
