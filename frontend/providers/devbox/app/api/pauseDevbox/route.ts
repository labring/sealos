import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'

export async function POST(req: NextRequest) {
  try {
    //TODO: zod later
    const { devboxName } = (await req.json()) as { devboxName: string }

    const headerList = headers()

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    // NOTE: 可以这么做么？
    const response = await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default', // TODO: namespace动态获取
      'devboxes',
      devboxName,
      { spec: { state: 'Stopped' } },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    )
    console.log(response)

    // TODO: ApiResp的使用不太好，尝试去除
    return jsonRes({
      data: 'success pause devbox'
    })
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
