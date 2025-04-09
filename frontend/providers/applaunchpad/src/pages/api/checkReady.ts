import { appDeployKey, ProtocolList } from '@/constants/app';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApplicationProtocolType } from '@/types/app';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { appName } = req.query as { appName: string };
    const port = global.AppConfig.cloud.port;
    if (!appName) {
      throw new Error('appName is empty');
    }

    const { k8sNetworkingApp, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const ingress = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
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
        const backendProtocol = item?.metadata?.annotations?.[
          'nginx.ingress.kubernetes.io/backend-protocol'
        ] as ApplicationProtocolType;

        const fetchUrl = `https://${host}`;
        const protocol =
          ProtocolList.find((item) => item.value === backendProtocol)?.label || 'https://';
        const url = `${protocol}${host}${port ? `${port}` : ''}`;

        try {
          const response = await fetch(fetchUrl);

          if (response.status === 404 && response.headers.get('content-length') === '0') {
            return { ready: false, url, error: '404' };
          }

          const text = await response.text();

          if (
            response.status === 503 &&
            (text.includes('upstream connect error') || text.includes('upstream not health'))
          ) {
            return { ready: false, url, error: 'Upstream not healthy' };
          }

          return { ready: true, url };
        } catch (error) {
          return { ready: false, url, error: 'fetch error' };
        }
      })
    );

    return jsonRes(res, {
      code: 200,
      data: checkResults
    });
  } catch (error: any) {
    console.error(error);
    return jsonRes(res, {
      code: 500,
      error: error?.message
    });
  }
}
