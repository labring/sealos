import { NextRequest } from 'next/server';

import { PortInfos } from '@/types/ingress';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { ProtocolType } from '@/types/devbox';
import { devboxDB } from '@/services/db/init';
import { adaptDevboxDetailV2 } from '@/utils/adapt';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { RequestSchema } from './schema';
import { parseTemplateConfig } from '@/utils/tools';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;

    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('devboxName') as string;

    const validationResult = RequestSchema.safeParse({ devboxName });

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        error: 'Invalid request parameters'
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
        name: true,
        config: true
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
    const resp = [devboxBody, portInfos, template] as [KBDevboxTypeV2, PortInfos, typeof template];
    const adaptedData = adaptDevboxDetailV2(resp);

    // get ssh info
    const response = await k8sCore.readNamespacedSecret(devboxName, namespace);
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string;

    if (!base64PrivateKey) {
      return jsonRes({
        code: 404,
        message: 'SSH keys not found'
      });
    }

    const config = parseTemplateConfig(template.config);

    return jsonRes({
      data: {
        id: adaptedData.id,
        name: adaptedData.name,
        status: adaptedData.status.value,
        createTime: adaptedData.createTime,
        imageName: adaptedData.image,
        cpu: adaptedData.cpu,
        memory: adaptedData.memory,
        networks: adaptedData.networks,
        sshPort: adaptedData.sshPort,
        base64PrivateKey,
        userName: config.user,
        workingDir: config.workingDir,
        domain: process.env.SEALOS_DOMAIN
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
