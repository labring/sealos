import { appDeployKey } from '@/constants/app';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApplicationProtocolType } from '@/types/app';
import { normalizeCustomDomainMode } from '@/utils/custom-domain';
import { getReadyCheckTarget, ReadyCheckTarget } from '@/utils/ready-check';
import http from 'http';
import https from 'https';
import { NextApiRequest, NextApiResponse } from 'next';

const requestReadyCheckTarget = (target: ReadyCheckTarget) => {
  if (!target.hostHeader) {
    return fetch(target.fetchUrl);
  }

  return new Promise<{
    status: number;
    headers: { get: (name: string) => string | null };
    text: () => Promise<string>;
  }>((resolve, reject) => {
    const url = new URL(target.fetchUrl);
    const requestClient = url.protocol === 'https:' ? https : http;
    const req = requestClient.request(
      url,
      {
        headers: {
          Host: target.hostHeader
        },
        servername: target.servername,
        rejectUnauthorized: false
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode || 0,
            headers: {
              get: (name: string) => {
                const value = response.headers[name.toLowerCase()];
                return Array.isArray(value) ? value.join(', ') : value || null;
              }
            },
            text: async () => body
          });
        });
      }
    );

    req.setTimeout(30000, () => {
      req.destroy(new Error('ready check request timeout'));
    });
    req.on('error', reject);
    req.end();
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { appName } = req.query as { appName: string };
    const accessConfig = {
      disableHttps: !!global.AppConfig.cloud.disableHttps,
      cloudPort: global.AppConfig.cloud.port,
      httpPort: global.AppConfig.cloud.httpPort
    };
    const customDomainMode = normalizeCustomDomainMode(
      global.AppConfig.launchpad.customDomain?.mode
    );
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
      throw new Error('Check ready error: No ingress found');
    }

    const checkResults = await Promise.all(
      ingress.body.items.map(async (item) => {
        if (!item.spec?.rules?.[0]) {
          return { ready: false, url: '/', error: 'Invalid ingress configuration' };
        }

        const rule = item.spec.rules[0];
        const host = rule.host;
        if (!host) {
          return { ready: false, url: '/', error: 'Invalid ingress host' };
        }
        const backendProtocol = item?.metadata?.annotations?.[
          'nginx.ingress.kubernetes.io/backend-protocol'
        ] as ApplicationProtocolType;
        const target = getReadyCheckTarget({
          host,
          backendProtocol,
          config: accessConfig,
          customDomainMode,
          gatewayHost: process.env.CUSTOM_DOMAIN_READY_CHECK_GATEWAY_HOST
        });

        try {
          const response = await requestReadyCheckTarget(target);

          if (response.status === 404 && response.headers.get('content-length') === '0') {
            return { ready: false, url: target.url, error: '404' };
          }

          const text = await response.text();

          if (
            response.status === 503 &&
            (text.includes('upstream connect error') || text.includes('upstream not health'))
          ) {
            return { ready: false, url: target.url, error: 'Upstream not healthy' };
          }

          return { ready: true, url: target.url };
        } catch (error) {
          return { ready: false, url: target.url, error: 'fetch error' };
        }
      })
    );

    return jsonRes(res, {
      code: 200,
      data: checkResults
    });
  } catch (error: any) {
    return jsonRes(res, {
      code: 500,
      error: error?.message
    });
  }
}
