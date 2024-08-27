import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    //TODO: zod later
    const { name, releaseDes } = (await req.json()) as { name: string; releaseDes: string }
    const headerList = req.headers

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    // NOTE: 可以这么做么？
    const response = await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default', // TODO: namespace动态获取
      'devboxreleases',
      name,
      { spec: { notes: releaseDes } },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    )

    // TODO: ApiResp的使用不太好，尝试去除
    return jsonRes({
      data: 'success edit devbox version description'
    })
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
