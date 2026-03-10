import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

import { nanoid } from '@/utils/tools';
import { devboxIdKey, devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { DeployDevboxPathParamsSchema } from './schema';
import { getK8s } from '@/services/backend/kubernetes';
import { authSession } from '@/services/backend/auth';
import { KBDevboxReleaseType, KBDevboxTypeV2 } from '@/types/k8s';
import { devboxDB } from '@/services/db/init';
import { ProtocolType } from '@/types/devbox';
import { adaptDevboxVersionListItem } from '@/utils/adapt';
import { Config } from '@/src/config';
import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/app/api/v2alpha/api-error';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { name: string; tag: string } }
) {
  try {
    const config = Config();
    const { name: devboxName, tag } = DeployDevboxPathParamsSchema.parse(params);
    const cpu = 2000;
    const memory = 2048;

    const headerList = req.headers;
    const headers = {
      Authorization: headerList.get('Authorization') || ''
    };

    const { namespace, k8sCore, k8sNetworkingApp, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: releaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxreleases'
    )) as { body: { items: KBDevboxReleaseType[] } };

    const matchingDevboxVersions = releaseBody.items.filter((item: any) => {
      return item.spec && item.spec.devboxName === devboxName;
    });

    const adaptedVersions = matchingDevboxVersions.map(adaptDevboxVersionListItem).sort((a, b) => {
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
    });

    if (!adaptedVersions.some((item) => item.tag === tag && item.status.value === 'Success')) {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: `Devbox release tag ${tag} is not found or not successful`
      });
    }

    const appName = `${devboxName}-release-${nanoid()}`;
    const image = `${config.devbox.runtime.registryHost}/${namespace}/${devboxName}:${tag}`;

    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
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
            kind: true
          }
        },
        uid: true,
        image: true,
        name: true,
        config: true
      }
    });

    if (!template) {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Template not found'
      });
    }

    const label = `${devboxKey}=${devboxName}`;

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

    const networks: any[] =
      service?.spec?.ports?.map((svcport) => {
        const ingressInfo = ingressList.find((ingress) => ingress.port === svcport.port);
        return {
          networkName: `network-${appName}-${nanoid()}`,
          portName: `${nanoid()}`,
          protocol: 'TCP',
          openPublicDomain: true,
          publicDomain: `${nanoid()}`,
          customDomain: '',
          domain: config.devbox.userDomain.domain,
          port: svcport.port,
          appProtocol: ingressInfo?.protocol as ProtocolType
        };
      }) || [];

    const formData = {
      appForm: {
        appName,
        imageName: image,
        runCMD: '/bin/bash -c',
        cmdParam: '/home/devbox/project/entrypoint.sh',
        replicas: 1,
        labels: {
          [devboxIdKey]: devboxName
        },
        cpu,
        memory,
        networks: networks,
        envs: [],
        hpa: {
          use: false,
          target: 'cpu',
          value: 50,
          minReplicas: 1,
          maxReplicas: 5
        },
        configMapList: [],
        secret: {
          use: false,
          username: '',
          password: '',
          serverAddress: 'docker.io'
        },
        storeList: [],
        gpu: {}
      }
    };
    const fetchResponse = await fetch(
      config.devbox.components.appLaunchpad.url + '/api/v1alpha/createApp',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: headers.Authorization
        },
        body: JSON.stringify(formData)
      }
    );

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('Applaunchpad API error:', errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      return sendError({
        status: 500,
        type: ErrorType.OPERATION_ERROR,
        code: ErrorCode.OPERATION_FAILED,
        message: errorData.error || `Failed to deploy to applaunchpad: ${fetchResponse.statusText}`
      });
    }

    const responseData = await fetchResponse.json();

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error('Deploy devbox error:', err);

    if (err instanceof z.ZodError) {
      return sendValidationError(err, 'Invalid request parameters');
    }
    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: err?.message || 'Internal server error'
    });
  }
}
