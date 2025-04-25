import { NextRequest } from 'next/server';
import { V1Ingress, V1Service } from '@kubernetes/client-node';
import { PatchUtils } from '@kubernetes/client-node';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey, ingressProtocolKey, publicDomainKey, YamlKindEnum } from '@/constants/devbox';
import { RequestSchema } from './schema';
import { json2Service, json2Ingress } from '@/utils/json2Yaml';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request body',
        error: validationResult.error.errors
      });
    }

    const { devboxName, port, protocol } = validationResult.data;
    const headerList = req.headers;

    const { k8sCore, k8sNetworkingApp, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // Get devbox ingress
    const label = `${devboxKey}=${devboxName}`;
    const [ingressesResponse, serviceResponse2] = await Promise.all([
      k8sNetworkingApp
        .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, label)
        .catch(() => null),
      k8sCore.readNamespacedService(devboxName, namespace, undefined).catch(() => null)
    ]);

    const ingresses = ingressesResponse?.body.items || [];
    const service = serviceResponse2?.body as V1Service;

    const ingressList = ingresses.map((item: V1Ingress) => {
      const defaultDomain = item.metadata?.labels?.[publicDomainKey];
      const tlsHost = item.spec?.tls?.[0]?.hosts?.[0];
      const portNumber = item.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number;
      return {
        networkName: item.metadata?.name,
        port: portNumber,
        protocol: item.metadata?.annotations?.[ingressProtocolKey],
        openPublicDomain: !!defaultDomain,
        publicDomain: defaultDomain === tlsHost ? tlsHost : defaultDomain,
        customDomain: defaultDomain === tlsHost ? '' : tlsHost
      };
    });

    const existingPorts =
      service?.spec?.ports?.map((svcport: any) => {
        const ingressInfo = ingressList.find((ingress) => ingress.port === svcport.port);

        return {
          portName: svcport.name,
          port: svcport.port,
          protocol: ingressInfo?.protocol || 'HTTP',
          networkName: ingressInfo?.networkName,
          openPublicDomain: !!ingressInfo?.openPublicDomain,
          publicDomain: ingressInfo?.publicDomain,
          customDomain: ingressInfo?.customDomain
        };
      }) || [];

    // Check if port already exists
    const portExists = existingPorts.some((p) => p.port === port);
    if (portExists) {
      return jsonRes({
        data: existingPorts
      });
    }

    // Create new port
    const { INGRESS_SECRET } = process.env;
    const newNetwork = {
      name: devboxName,
      networks: [
        {
          networkName: `${devboxName}-${port}`,
          portName: `port-${port}`,
          port,
          protocol,
          openPublicDomain: true // Default public domain is enabled
        }
      ]
    };

    const serviceYaml = json2Service(newNetwork);
    const ingressYaml = json2Ingress(newNetwork, INGRESS_SECRET as string);

    // Parse YAML to JSON for patch
    const serviceJson = JSON.parse(serviceYaml);
    const ingressJson = JSON.parse(ingressYaml);

    // Update service
    await k8sCore.replaceNamespacedService(devboxName, namespace, serviceJson);

    // Update ingress
    await k8sNetworkingApp.patchNamespacedIngress(
      ingressJson.metadata.name,
      namespace,
      ingressJson,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
    );

    return jsonRes({
      data: [
        ...existingPorts,
        {
          portName: `port-${port}`,
          port,
          protocol,
          networkName: `${devboxName}-${port}`,
          openPublicDomain: true
        }
      ]
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
