import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey } from '@/constants/devbox';
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

    const { devboxName, onlyIngress, networkType } = validationResult.data;
    const headerList = req.headers;

    const { k8sCustomObjects, namespace, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // get ingress and modify ingress annotations
    const ingressesResponse = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    );
    const ingresses: any = (ingressesResponse.body as { items: any[] }).items;

    ingresses.forEach(async (ingress: any) => {
      const annotationsIngressClass =
        ingress.metadata?.annotations?.['kubernetes.io/ingress.class'];
      const specIngressClass = ingress.spec?.ingressClassName;

      if (
        (annotationsIngressClass && annotationsIngressClass === 'pause') ||
        (specIngressClass && specIngressClass === 'pause')
      ) {
        if (annotationsIngressClass) {
          await k8sNetworkingApp.patchNamespacedIngress(
            ingress.metadata.name,
            namespace,
            { metadata: { annotations: { 'kubernetes.io/ingress.class': 'nginx' } } },
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
            { spec: { ingressClassName: 'nginx' } },
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

    if (!onlyIngress) {
      const patchData: any = { spec: { state: 'Running' } };

      if (networkType && networkType !== 'SSHGate') {
        patchData.spec.network = { type: 'SSHGate' };
      }

      await k8sCustomObjects.patchNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha2',
        namespace,
        'devboxes',
        devboxName,
        patchData,
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

    return jsonRes({
      data: onlyIngress ? 'success resume ingress' : 'success start devbox'
    });
  } catch (err: any) {
    console.log('error', err);
    return jsonRes({
      code: err?.statusCode || err?.response?.statusCode || 500,
      error: err
    });
  }
}
