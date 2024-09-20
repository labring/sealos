import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName') as string
    const networks = JSON.parse(searchParams.get('networks') as string) as string[]
    const headerList = req.headers

    const { k8sCustomObjects, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    )

    // delete service and ingress at the same time
    if (networks.length > 0) {
      await k8sCore.deleteNamespacedService(devboxName, namespace)
      networks.forEach(async (networkName: string) => {
        await k8sCustomObjects.deleteNamespacedCustomObject(
          'networking.k8s.io',
          'v1',
          namespace,
          'ingresses',
          networkName
        )
        // delete issuer and certificate at the same time
        await k8sCustomObjects.deleteNamespacedCustomObject(
          'cert-manager.io',
          'v1',
          namespace,
          'issuers',
          networkName
        )
        await k8sCustomObjects.deleteNamespacedCustomObject(
          'cert-manager.io',
          'v1',
          namespace,
          'certificates',
          networkName
        )
      })
    }

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
