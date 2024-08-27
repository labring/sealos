import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export async function GET(req: NextRequest) {
  try {
    const queryString = req.url.split('?')[1]
    const searchParams = new URLSearchParams(queryString)
    const devboxName = searchParams.get('devboxName') as string
    const headerList = req.headers

    const { k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const response = await k8sCore.readNamespacedSecret(devboxName, 'default')

    const base64Secret = response.body.data?.['SEALOS_DEVBOX_PASSWORD'] as string

    const normalSecret = Buffer.from(base64Secret, 'base64').toString('utf-8')

    return jsonRes({ data: normalSecret })
  } catch (err: any) {
    // TODO: ApiResp全部去除
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
