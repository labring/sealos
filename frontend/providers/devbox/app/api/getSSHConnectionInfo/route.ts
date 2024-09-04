import { NextRequest } from 'next/server'

import { runtimeNamespace } from '@/stores/static'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName') as string
    const runtimeName = searchParams.get('runtimeName') as string
    const headerList = req.headers

    const { k8sCore, namespace, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace)

    const base64PublicKey = response.body.data?.['SEALOS_DEVBOX_PUBLIC_KEY'] as string
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string

    const { body: runtime }: any = await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      runtimeNamespace,
      'runtimes',
      runtimeName
    )
    const userName = runtime.spec.config.user

    return jsonRes({ data: { base64PublicKey, base64PrivateKey, userName } })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
