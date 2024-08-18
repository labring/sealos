import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'

export async function GET(req: NextRequest) {
  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    })

    const response: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default', // TODO: namespace动态获取
      'devboxes',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    )

    const matchingDevboxes = response?.body?.items.filter((item: any) => {
      return item.metadata && !item.metadata.deletionTimestamp
    })
    return jsonRes<ApiResp>({ data: matchingDevboxes })
  } catch (err: any) {
    // TODO: ApiResp全部去除
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
