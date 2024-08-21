import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const versionName = searchParams.get('versionName') as string
    const headerList = headers()

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    // TODO: 这里的name不知道确定是什么，所以导致可能删除不成功
    const response = await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default',
      'devboxreleases',
      versionName
    )

    return jsonRes({
      data: 'success delete devbox version'
    })
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
