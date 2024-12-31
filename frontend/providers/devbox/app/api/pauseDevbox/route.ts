import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { devboxKey } from '@/constants/devbox'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { devboxName } = (await req.json()) as { devboxName: string }

    const headerList = req.headers

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    // get ingress and modify ingress annotations
    const ingressesResponse = await k8sCustomObjects.listNamespacedCustomObject(
      'networking.k8s.io',
      'v1',
      namespace,
      'ingresses',
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    )
    const ingresses: any = (ingressesResponse.body as { items: any[] }).items

    ingresses.forEach(async (ingress: any) => {
      const annotationsIngressClass = ingress.metadata?.annotations?.['kubernetes.io/ingress.class']
      const specIngressClass = ingress.spec?.ingressClassName

      if (
        (annotationsIngressClass && annotationsIngressClass === 'nginx') ||
        (specIngressClass && specIngressClass === 'nginx')
      ) {
        if (annotationsIngressClass) {
          await k8sCustomObjects.patchNamespacedCustomObject(
            'networking.k8s.io',
            'v1',
            namespace,
            'ingresses',
            ingress.metadata.name,
            { metadata: { annotations: { 'kubernetes.io/ingress.class': 'pause' } } },
            undefined,
            undefined,
            undefined,
            {
              headers: {
                'Content-Type': 'application/merge-patch+json'
              }
            }
          )
        } else if (specIngressClass) {
          await k8sCustomObjects.patchNamespacedCustomObject(
            'networking.k8s.io',
            'v1',
            namespace,
            'ingresses',
            ingress.metadata.name,
            { spec: { ingressClassName: 'pause' } },
            undefined,
            undefined,
            undefined,
            {
              headers: {
                'Content-Type': 'application/merge-patch+json'
              }
            }
          )
        }
      }
    })

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
    )

    return jsonRes({
      data: 'success pause devbox'
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
