import { z } from 'zod';
import { NextRequest } from 'next/server';

import { nanoid } from '@/utils/tools';
import { devboxIdKey, devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { DeployDevboxRequestSchema } from './schema';
import { jsonRes } from '@/services/backend/response';
import { getK8s } from '@/services/backend/kubernetes';
import { authSession } from '@/services/backend/auth';
import { KBDevboxReleaseType, KBDevboxTypeV2 } from '@/types/k8s';
import { devboxDB } from '@/services/db/init';
import { ProtocolType } from '@/types/devbox';
import { adaptDevboxVersionListItem } from '@/utils/adapt';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedBody = DeployDevboxRequestSchema.parse(body);
    const { devboxName, tag, cpu = 2000, memory = 4096 } = validatedBody;
    const headerList = req.headers;

    const headers = {
      Authorization: headerList.get('Authorization') || ''
    };
    const { namespace, k8sCore, k8sNetworkingApp, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // check if the devbox release exists
    const { body: releaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
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
      return jsonRes({
        code: 500,
        error: `devbox release tag ${tag} is not found or not success`
      });
    }

    const appName = `${devboxName}-release-${nanoid()}`;
    const image = `${process.env.REGISTRY_ADDR}/${namespace}/${devboxName}:${tag}`;

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
          domain: process.env.INGRESS_DOMAIN || '',
          port: svcport.port,
          appProtocol: ingressInfo?.protocol as ProtocolType
        };
      }) || [];

    const formData = {
      appForm: {
        appName,
        imageName: image,
        runCMD: '/bin/bash -c', // FIXME: Currently using static data here (switching to dynamic requires many changes), will use dynamic method later
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
      `https://applaunchpad.${process.env.SEALOS_DOMAIN}/api/v1alpha/createApp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: headers.Authorization
        },
        body: JSON.stringify(formData)
      }
    );

    const responseData = await fetchResponse.json();

    const ingressResource = responseData.data.find((item: any) => item.kind === 'Ingress');
    const publicDomains =
      ingressResource?.spec?.rules?.map((rule: any) => ({
        host: rule.host,
        port: rule.http?.paths?.[0]?.backend?.service?.port?.number || 80
      })) || [];

    const response = {
      data: {
        message: 'success deploy devbox',
        appName,
        publicDomains
      }
    };

    return jsonRes(response);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return jsonRes({
        code: 400,
        error: err.errors
      });
    }
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
