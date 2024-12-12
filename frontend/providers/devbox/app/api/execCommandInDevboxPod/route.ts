import { NextRequest } from 'next/server'

import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { devboxName, command } = (await req.json()) as {
      devboxName: string
      command: string
    }

    const headerList = req.headers

    const { namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    // get pods
    const {
      body: { items: pods }
    } = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/name=${devboxName}`
    )

    const podName = pods[0].metadata?.name
    const containerName = pods[0].spec?.containers[0].name

    if (!podName) {
      return jsonRes({
        code: 500,
        error: 'Pod not found'
      })
    }

    const { body } = await k8sCore.connectGetNamespacedPodExec(
      podName,
      namespace,
      `sh -c "${command}"`,
      containerName,
      true,
      true,
      true,
      false
    )
    console.log('body', body)

    return jsonRes({
      data: body
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
