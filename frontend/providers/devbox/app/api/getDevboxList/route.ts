import { NextRequest } from 'next/server'

import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { KBDevboxType, KBRuntimeType } from '@/types/k8s'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers
    const { ROOT_RUNTIME_NAMESPACE } = process.env

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const [devboxResponse, runtimeResponse] = await Promise.all([
      k8sCustomObjects.listNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxes'
      ),
      k8sCustomObjects.listNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        ROOT_RUNTIME_NAMESPACE || 'devbox-system',
        'runtimes'
      )
    ])

    const devboxBody = devboxResponse.body as { items: KBDevboxType[] }
    const runtimeBody = runtimeResponse.body as { items: KBRuntimeType[] }

    // add runtimeType to devbox yaml
    const resp = devboxBody.items.map((item) => {
      const runtimeName = item.spec.runtimeRef.name
      const runtime = runtimeBody.items.find((item) => item.metadata.name === runtimeName)

      item.spec.runtimeType = runtime?.spec.classRef

      return item
    })

    return jsonRes({ data: resp })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
