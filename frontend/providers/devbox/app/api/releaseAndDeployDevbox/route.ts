import { NextRequest } from 'next/server';
import { nanoid } from '@/utils/tools';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KBDevboxReleaseType } from '@/types/k8s';
import {
  DevboxReleaseStatusEnum,
  devboxIdKey,
  devboxKey,
  ingressProtocolKey,
  publicDomainKey
} from '@/constants/devbox';
import { json2DevboxRelease } from '@/utils/json2Yaml';
import { ReleaseAndDeployDevboxRequestSchema } from './schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedBody = ReleaseAndDeployDevboxRequestSchema.parse(body);
    const { devboxName, tag, releaseDes, devboxUid, cpu = 200, memory = 128 } = validatedBody;
    const headerList = req.headers;

    const { applyYamlList, namespace, k8sCustomObjects, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // 2. shutdown devbox
    const ingressesResponse2 = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    );
    const ingresses2: any = (ingressesResponse2.body as { items: any[] }).items;

    ingresses2.forEach(async (ingress: any) => {
      const annotationsIngressClass =
        ingress.metadata?.annotations?.['kubernetes.io/ingress.class'];
      const specIngressClass = ingress.spec?.ingressClassName;

      if (
        (annotationsIngressClass && annotationsIngressClass === 'nginx') ||
        (specIngressClass && specIngressClass === 'nginx')
      ) {
        if (annotationsIngressClass) {
          await k8sNetworkingApp.patchNamespacedIngress(
            ingress.metadata.name,
            namespace,
            { metadata: { annotations: { 'kubernetes.io/ingress.class': 'pause' } } },
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {
              headers: {
                'Content-Type': 'application/merge-patch+json'
              }
            }
          );
        } else if (specIngressClass) {
          await k8sNetworkingApp.patchNamespacedIngress(
            ingress.metadata.name,
            namespace,
            { spec: { ingressClassName: 'pause' } },
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {
              headers: {
                'Content-Type': 'application/merge-patch+json'
              }
            }
          );
        }
      }
    });

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName,
      { spec: { state: 'Stopped' } },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );

    // 3. create devbox release
    const { body: releaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxreleases'
    )) as { body: { items: KBDevboxReleaseType[] } };

    if (
      releaseBody.items.some((item: any) => {
        return (
          item.spec &&
          item.spec.devboxName === devboxName &&
          item.metadata.ownerReferences[0].uid === devboxUid &&
          item.spec.newTag === tag
        );
      })
    ) {
      return jsonRes({
        code: 409,
        error: 'devbox release already exists'
      });
    }

    const devbox = json2DevboxRelease({ devboxName, tag, releaseDes, devboxUid });
    await applyYamlList([devbox], 'create');

    // 4. wait for release success
    let isReleaseSuccess = false;
    let retryCount = 0;
    const maxRetries = 30; // max wait 30 times
    const retryInterval = 10000; // wait 10 seconds

    while (!isReleaseSuccess && retryCount < maxRetries) {
      const { body: currentReleaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxreleases'
      )) as { body: { items: KBDevboxReleaseType[] } };

      const currentRelease = currentReleaseBody.items.find(
        (item: any) =>
          item.spec &&
          item.spec.devboxName === devboxName &&
          item.metadata.ownerReferences[0].uid === devboxUid &&
          item.spec.newTag === tag
      );

      if (currentRelease?.status?.phase === DevboxReleaseStatusEnum.Success) {
        isReleaseSuccess = true;
        break;
      }

      if (currentRelease?.status?.phase === DevboxReleaseStatusEnum.Failed) {
        return jsonRes({
          code: 500,
          error: 'devbox release failed'
        });
      }

      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      retryCount++;
    }

    if (!isReleaseSuccess) {
      return jsonRes({
        code: 500,
        error: 'devbox release timeout'
      });
    }

    // 5. get network info
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

    const portInfos =
      service?.spec?.ports?.map((svcport) => {
        const ingressInfo = ingressList.find((ingress) => ingress.port === svcport.port);
        return {
          portName: svcport.name!,
          port: svcport.port,
          protocol: 'TCP',
          networkName: `network-${devboxName}-${nanoid()}`,
          openPublicDomain: !!ingressInfo?.openPublicDomain,
          publicDomain: ingressInfo?.publicDomain || `${devboxName}-${nanoid()}`,
          customDomain: ingressInfo?.customDomain || '',
          domain: process.env.INGRESS_DOMAIN || '',
          appProtocol: 'HTTP'
        };
      }) || [];

    // 6. deploy app
    const appName = `${devboxName}-release-${nanoid()}`;
    const image = `${process.env.REGISTRY_ADDR}/${namespace}/${devboxName}:${tag}`;

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
        networks:
          portInfos.length > 0
            ? portInfos
            : [
                {
                  networkName: `network-${appName}`,
                  portName: 'host',
                  port: 80,
                  protocol: 'TCP',
                  publicDomain: '',
                  openPublicDomain: true,
                  customDomain: '',
                  domain: process.env.INGRESS_DOMAIN || '',
                  appProtocol: 'HTTP'
                }
              ],
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
          Authorization: headerList.get('Authorization') || ''
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
        message: 'success create and deploy devbox release',
        appName,
        publicDomains
      }
    };

    return jsonRes(response);
  } catch (err: any) {
    console.log(err);
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
