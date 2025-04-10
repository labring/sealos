import { devboxKey } from '@/constants/devbox';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const devboxName = request.nextUrl.searchParams.get('devboxName');

    if (!devboxName) {
      throw new Error('devboxName is empty');
    }

    const { k8sNetworkingApp, namespace } = await getK8s({
      kubeconfig: await authSession(request.headers)
    });
    const label = `${devboxKey}=${devboxName}`;
    const ingress = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      label
    );

    if (!ingress.body.items || ingress.body.items.length === 0) {
      throw new Error('No ingress found');
    }

    const checkResults = await Promise.all(
      ingress.body.items.map(async (item) => {
        if (!item.spec?.rules?.[0]) {
          return { ready: false, url: '/', error: 'Invalid ingress configuration' };
        }

        const rule = item.spec.rules[0];
        const host = rule.host;
        const fetchUrl = `https://${host}`;
        const url = `https://${host}`;

        try {
          const response = await fetch(fetchUrl, {
            cache: 'no-store'
          });

          if (response.status === 404 && response.headers.get('content-length') === '0') {
            return { ready: false, url, error: '404' };
          }

          const text = await response.text();

          if (
            response.status === 503 &&
            (text.includes('upstream connect error') || text.includes('upstream not health'))
          ) {
            return { ready: false, url, error: 'Service Unavailable (503)' };
          }

          return { ready: true, url };
        } catch (error) {
          console.log('error', error);
          return { ready: false, url, error: 'fetch error' };
        }
      })
    );

    return jsonRes({
      code: 200,
      data: checkResults
    });
  } catch (error: any) {
    return jsonRes({
      code: 500,
      error: error?.message
    });
  }
}
