import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName')
    const headerList = headers()

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const response: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default',
      'devboxreleases',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    )

    const matchingDevboxVersions = response?.body?.items.filter((item: any) => {
      return item.spec && item.spec.devboxName === devboxName
    })

    return jsonRes({ data: matchingDevboxVersions })
  } catch (err: any) {
    // TODO: ApiResp全部去除
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
