import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName') as string
    const headerList = req.headers

    const { k8sCustomObjects, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    )

    // delete service and ingress at the same time
    try {
      await k8sCustomObjects.deleteNamespacedCustomObject(
        'networking.k8s.io',
        'v1',
        namespace,
        'ingresses',
        devboxName,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      )
    } catch (err: any) {
      if (err.response?.statusCode !== 404) {
        throw err
      }
    }

    await k8sCore.deleteNamespacedService(devboxName, namespace)

    return jsonRes({
      data: 'success delete devbox'
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
