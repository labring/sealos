import { NextRequest } from 'next/server';

import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
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

    const { devboxName } = validationResult.data;
    const headerList = req.headers;

    const { k8sCustomObjects, namespace, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // restart = stopped + running

    // 1. stopped
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

    // NOTE： if stop in there,maybe later stopped but not start,and annotations not be adjusted.
    // 2.get devbox pod and ensure the devbox pod is deleted,when the devbox pod is deleted,the devbox will be restarted
    let pods;
    const maxRetries = 10;
    let retries = 0;

    do {
      const {
        body: { items }
      } = await k8sCore.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app.kubernetes.io/name=${devboxName}`
      );
      pods = items;

      if (pods.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      retries++;
    } while (pods.length > 0 && retries < maxRetries);

    if (retries === maxRetries) {
      throw new Error('Restart devbox failed');
    }
    console.log('devbox pod is deleted');

    // 3. running
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

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName,
      { spec: { state: 'Running' } },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );

    return jsonRes({
      data: 'success restart devbox'
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
