import { NextRequest } from 'next/server';

import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { getPayloadWithoutVerification, verifyToken } from '@/services/backend/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const kc = req.nextUrl.searchParams.get('kc');
    const name = req.nextUrl.searchParams.get('name'); // api key name
    const { payload, token } = getPayloadWithoutVerification(req.headers);

    if (!payload || !token) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }
    const { devboxName, namespace } = payload;

    const { k8sCore } = await getK8s({
      kubeconfig:
        process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '',
      useDefaultConfig: process.env.NODE_ENV !== 'development'
    });

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace);

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8');

    if (!verifyToken(token, jwtSecret)) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }
    const aiproxyUrl =
      process.env.AIPROXY_INTERNAL_URL ||
      `http://aiproxy-web.${process.env.SEALOS_DOMAIN}/api/keyhub`;

    const aiKeyResponse = await fetch(aiproxyUrl, {
      method: 'POST',
      body: JSON.stringify({
        name,
        kc
      })
    });

    const apiKeyData = await aiKeyResponse.json();

    return jsonRes({
      data: {
        apiKey: apiKeyData.data.key
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err?.body || err
    });
  }
}
