import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName') as string

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(req)
    })

    // TODO: 这里的name不知道确定是什么，所以导致可能删除不成功
    await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default',
      'devboxes',
      devboxName,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    )

    return jsonRes({
      data: 'success delete devbox'
    })
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
