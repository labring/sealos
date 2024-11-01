import { NextRequest } from 'next/server'

import { defaultEnv } from '@/stores/env'
import { KBRuntimeType } from '@/types/k8s'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { authSession, generateAccessToken } from '@/services/backend/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName') as string
    const runtimeName = searchParams.get('runtimeName') as string

    const headerList = req.headers

    const { ROOT_RUNTIME_NAMESPACE } = process.env

    const { k8sCore, namespace, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace)

    const base64PublicKey = response.body.data?.['SEALOS_DEVBOX_PUBLIC_KEY'] as string
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8')
    const token = generateAccessToken({ namespace, devboxName }, jwtSecret)

    const { body: runtime } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      ROOT_RUNTIME_NAMESPACE || defaultEnv.rootRuntimeNamespace,
      'runtimes',
      runtimeName
    )) as { body: KBRuntimeType }

    const userName = runtime.spec.config.user

    return jsonRes({ data: { base64PublicKey, base64PrivateKey, userName, token } })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
