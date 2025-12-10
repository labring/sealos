import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { json2Ingress } from '@/utils/json2Yaml';
import { RequestSchema } from './schema';
import { devboxKey } from '@/constants/devbox';
import { PatchUtils, V1Ingress } from '@kubernetes/client-node';
import { nanoid, str2Num } from '@/utils/tools';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: validationResult.error.errors
      });
    }

    const { devboxName, port } = validationResult.data;
    const headerList = req.headers;

    const { applyYamlList, k8sCore, k8sCustomObjects, k8sNetworkingApp, namespace } =
      await getK8s({
        kubeconfig: await authSession(headerList)
      });

    const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;

    if (!INGRESS_SECRET || !INGRESS_DOMAIN) {
      return jsonRes({
        code: 500,
        message: 'INGRESS_SECRET or INGRESS_DOMAIN is not configured'
      });
    }

    const label = `${devboxKey}=${devboxName}`;
    const existingIngressesResponse = await k8sNetworkingApp
      .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, label)
      .catch(() => null);
    const existingIngresses = existingIngressesResponse?.body.items || [];

    const existingIngress = existingIngresses.find(
      (ing: V1Ingress) =>
        ing.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number === port
    );

    const networkName = existingIngress?.metadata?.name || `${devboxName}-${nanoid()}`;
    const publicDomain = `${nanoid()}.${INGRESS_DOMAIN}`;
    const portName = `webide-${port}`;

    const network = {
      networkName,
      portName,
      port,
      protocol: 'HTTP' as const,
      openPublicDomain: true,
      publicDomain,
      customDomain: ''
    };

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName,
      {
        spec: {
          network: {
            type: 'NodePort',
            extraPorts: [{ containerPort: port }]
          },
          config: {
            appPorts: [
              {
                port: str2Num(port),
                name: portName,
                protocol: 'TCP',
                targetPort: str2Num(port)
              }
            ]
          }
        }
      },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH
        }
      }
    );

    await k8sCore.patchNamespacedService(
      devboxName,
      namespace,
      {
        spec: {
          ports: [
            {
              port: str2Num(port),
              targetPort: str2Num(port),
              name: portName
            }
          ]
        }
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
    );

    const ingressYaml = json2Ingress({ name: devboxName, networks: [network] }, INGRESS_SECRET);
    if (ingressYaml) {
      await applyYamlList([ingressYaml], existingIngress ? 'replace' : 'create');
    }

    return jsonRes({
      data: {
        publicDomain
      }
    });
  } catch (err: any) {
    console.error('WebIDE port update error:', err);

    return jsonRes({
      code: 500,
      message: err?.message || 'Failed to update WebIDE port',
      error: err
    });
  }
}
