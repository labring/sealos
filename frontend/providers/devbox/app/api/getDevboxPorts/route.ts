import { NextRequest } from 'next/server';
import { V1Ingress } from '@kubernetes/client-node';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { RequestSchema } from './schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('devboxName');

    if (!devboxName) {
      return jsonRes({
        code: 400,
        message: 'Devbox name is required'
      });
    }

    const validationResult = RequestSchema.safeParse({ devboxName });

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: validationResult.error.errors
      });
    }

    const headerList = req.headers;
    const { k8sCore, k8sNetworkingApp, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const label = `${devboxKey}=${devboxName}`;

    const [ingressesResponse, serviceResponse] = await Promise.all([
      k8sNetworkingApp
        .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, label)
        .catch(() => null),
      k8sCore.readNamespacedService(devboxName, namespace, undefined).catch(() => null)
    ]);

    const ingresses = ingressesResponse?.body.items || [];
    const service = serviceResponse?.body;

    const ingressList = ingresses.map((item: V1Ingress) => {
      const defaultDomain = item.metadata?.labels?.[publicDomainKey];
      const tlsHost = item.spec?.tls?.[0]?.hosts?.[0];
      return {
        networkName: item.metadata?.name || '',
        port: item.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number,
        protocol: item.metadata?.annotations?.[ingressProtocolKey] || 'HTTP',
        openPublicDomain: !!defaultDomain,
        publicDomain: defaultDomain === tlsHost ? tlsHost : defaultDomain,
        customDomain: defaultDomain === tlsHost ? '' : tlsHost
      };
    });

    const ports =
      service?.spec?.ports?.map((svcPort: any) => {
        const ingressInfo = ingressList.find((ingress) => ingress.port === svcPort.port);
        return {
          portName: svcPort.name || '',
          number: svcPort.port,
          protocol: ingressInfo?.protocol || 'HTTP',
          networkName: ingressInfo?.networkName || '',
          exposesPublicDomain: ingressInfo?.openPublicDomain || false,
          publicDomain: ingressInfo?.publicDomain || '',
          customDomain: ingressInfo?.customDomain || '',
          serviceName: devboxName,
          privateAddress: `http://${devboxName}.${namespace}:${svcPort.port}`
        };
      }) || [];

    return jsonRes({
      data: {
        ports
      }
    });
  } catch (err: any) {
    console.error('Get ports error:', err);
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error occurred while fetching ports',
      error: err
    });
  }
}
