import { NextRequest, NextResponse } from 'next/server';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { devboxKey } from '@/constants/devbox';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const devboxName = params.name;
    const headerList = req.headers;
    
    const { k8sCustomObjects, namespace, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const ingressesResponse = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    );
    const ingresses: any = (ingressesResponse.body as { items: any[] }).items;


    const ingressUpdatePromises = ingresses.map(async (ingress: any) => {
      const annotationsIngressClass =
        ingress.metadata?.annotations?.['kubernetes.io/ingress.class'];
      const specIngressClass = ingress.spec?.ingressClassName;

      if (
        (annotationsIngressClass && annotationsIngressClass === 'pause') ||
        (specIngressClass && specIngressClass === 'pause')
      ) {
        const patchOptions = {
          headers: {
            'Content-Type': 'application/merge-patch+json'
          }
        };

        if (annotationsIngressClass) {
          return k8sNetworkingApp.patchNamespacedIngress(
            ingress.metadata.name,
            namespace,
            { metadata: { annotations: { 'kubernetes.io/ingress.class': 'nginx' } } },
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            patchOptions
          );
        } else if (specIngressClass) {
          return k8sNetworkingApp.patchNamespacedIngress(
            ingress.metadata.name,
            namespace,
            { spec: { ingressClassName: 'nginx' } },
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            patchOptions
          );
        }
      }
    });

    await Promise.all(ingressUpdatePromises.filter(Boolean));

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
    return jsonRes({
      code: 500,
      message: err?.message || 'Failed to start DevBox',
      error: err
    });
  }
}