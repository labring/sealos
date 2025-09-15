import { NextRequest } from 'next/server';
import { PatchUtils } from '@kubernetes/client-node';
import { V1Ingress, V1Service } from '@kubernetes/client-node';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { RequestSchema } from './schema';

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

    const { devboxName, port } = validationResult.data;
    const headerList = req.headers;

    const { k8sCore, k8sNetworkingApp, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // Get devbox ingress and service
    const label = `${devboxKey}=${devboxName}`;
    const [ingressesResponse, serviceResponse] = await Promise.all([
      k8sNetworkingApp
        .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, label)
        .catch(() => null),
      k8sCore.readNamespacedService(devboxName, namespace, undefined).catch(() => null)
    ]);

    const ingresses = ingressesResponse?.body.items || [];
    const service = serviceResponse?.body as V1Service;

    if (!service) {
      return jsonRes({
        code: 404,
        message: 'Service not found'
      });
    }

    // Find and delete the ingress for the specified port
    const targetIngress = ingresses.find((item: V1Ingress) => {
      const portNumber = item.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number;
      return portNumber === port;
    });

    if (targetIngress) {
      await k8sNetworkingApp.deleteNamespacedIngress(targetIngress.metadata!.name!, namespace);
    }

    // Remove the port from service
    const servicePorts = service.spec?.ports || [];
    const updatedPorts = servicePorts.filter((p: any) => p.port !== port);

    if (updatedPorts.length === servicePorts.length) {
      return jsonRes({
        code: 404,
        message: 'Port not found in service'
      });
    }

    // If this is the last port, delete the entire service
    if (updatedPorts.length === 0) {
      await k8sCore.deleteNamespacedService(devboxName, namespace);
      return jsonRes({
        data: []
      });
    }

    await k8sCore.patchNamespacedService(
      devboxName,
      namespace,
      {
        spec: {
          ports: updatedPorts
        }
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
    );

    // Get remaining ports info
    const remainingIngressList = ingresses
      .filter((item: V1Ingress) => item.metadata?.name !== targetIngress?.metadata?.name)
      .map((item: V1Ingress) => {
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

    const remainingPorts = updatedPorts.map((svcport: any) => {
      const ingressInfo = remainingIngressList.find((ingress) => ingress.port === svcport.port);

      return {
        portName: svcport.name,
        port: svcport.port,
        protocol: ingressInfo?.protocol || 'HTTP',
        networkName: ingressInfo?.networkName,
        openPublicDomain: !!ingressInfo?.openPublicDomain,
        publicDomain: ingressInfo?.publicDomain,
        customDomain: ingressInfo?.customDomain
      };
    });

    return jsonRes({
      data: remainingPorts
    });
  } catch (err: any) {
    console.log('err', err);
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
