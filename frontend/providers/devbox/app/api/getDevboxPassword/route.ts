import { NextRequest } from 'next/server'

import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName') as string
    const headerList = req.headers

    const { k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const response = await k8sCore.readNamespacedSecret(devboxName, 'default')

    const base64PublicKey = response.body.data?.['SEALOS_DEVBOX_PUBLIC_KEY'] as string
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string

    return jsonRes({ data: { base64PublicKey, base64PrivateKey } })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
