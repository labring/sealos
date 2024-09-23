import { NextRequest } from 'next/server'

import { KBRuntimeType } from '@/types/k8s'
import { runtimeNamespace } from '@/stores/static'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const runtimeName = searchParams.get('runtimeName') as string
    const headerList = req.headers

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { body: runtime } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      runtimeNamespace,
      'runtimes',
      runtimeName
    )) as { body: KBRuntimeType }

    const data = {
      workingDir: runtime.spec.config.workingDir,
      releaseCommand: runtime.spec.config.releaseCommand.join(' '),
      releaseArgs: runtime.spec.config.releaseArgs.join(' ')
    }

    return jsonRes({ data })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
