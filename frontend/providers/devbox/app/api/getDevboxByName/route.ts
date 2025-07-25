import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { MockDevboxDetail } from '@/constants/mock';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { ProtocolType } from '@/types/devbox';
import { PortInfos } from '@/types/ingress';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { adaptDevboxDetailV2 } from '@/utils/adapt';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;

    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('devboxName') as string;
    const mock = searchParams.get('mock') === 'true';

    if (mock) {
      return jsonRes({
        data: MockDevboxDetail
      });
    }

    if (!devboxName) {
      return jsonRes({
        code: 400,
        error: 'devboxName is required'
      });
    }

    const { k8sCustomObjects, namespace, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxTypeV2 };
    const template = await devboxDB.template.findUnique({
      where: {
        uid: devboxBody.spec.templateID
      },
      select: {
        templateRepository: {
          select: {
            uid: true,
            iconId: true,
            name: true,
            kind: true,
            description: true
          }
        },
        uid: true,
        image: true,
        name: true
      }
    });
    if (!template) {
      return jsonRes({
        code: 500,
        error: 'template not found'
      });
    }
    const label = `${devboxKey}=${devboxName}`;
    // get ingresses and service
    const [ingressesResponse, serviceResponse] = await Promise.all([
      k8sNetworkingApp
        .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, label)
        .catch(() => null),
      k8sCore.readNamespacedService(devboxName, namespace, undefined).catch(() => null)
    ]);
    const ingresses = ingressesResponse?.body.items || [];
    const service = serviceResponse?.body;

    const ingressList = ingresses.map((item) => {
      const defaultDomain = item.metadata?.labels?.[publicDomainKey];
      const tlsHost = item.spec?.tls?.[0]?.hosts?.[0];
      return {
        networkName: item.metadata?.name,
        port: item.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number,
        protocol: item.metadata?.annotations?.[ingressProtocolKey],
        openPublicDomain: !!defaultDomain,
        publicDomain: defaultDomain === tlsHost ? tlsHost : defaultDomain,
        customDomain: defaultDomain === tlsHost ? '' : tlsHost
      };
    });

    const portInfos: PortInfos =
      service?.spec?.ports?.map((svcport) => {
        const ingressInfo = ingressList.find((ingress) => ingress.port === svcport.port);
        return {
          portName: svcport.name!,
          port: svcport.port,
          protocol: ingressInfo?.protocol as ProtocolType,
          networkName: ingressInfo?.networkName,
          openPublicDomain: !!ingressInfo?.openPublicDomain,
          publicDomain: ingressInfo?.publicDomain,
          customDomain: ingressInfo?.customDomain
        };
      }) || [];

    const data = adaptDevboxDetailV2([devboxBody, portInfos, template]);

    return jsonRes({ data });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
