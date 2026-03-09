import { NextRequest, NextResponse } from 'next/server';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { devboxKey } from '@/constants/devbox';
import { RequestSchema } from './schema';
import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/app/api/v2alpha/api-error';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      return sendValidationError(validationResult.error, 'Invalid request body');
    }

    const devboxName = params.name;
    const headerList = req.headers;
    const { k8sCustomObjects, namespace, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    try {
      await k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha2',
        namespace,
        'devboxes',
        devboxName
      );
    } catch (err: any) {
      if (err?.response?.statusCode === 404 || err?.statusCode === 404) {
        return sendError({
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: 'Devbox not found'
        });
      }
      throw err;
    }

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
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
      throw new Error('Max retries reached while waiting for devbox pod to be deleted');
    }

    const ingressesResponse = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    );
    const ingresses = (ingressesResponse.body as { items: any[] }).items;

    for (const ingress of ingresses) {
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
    }

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
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

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: err?.message || 'Failed to restart devbox'
    });
  }
}
