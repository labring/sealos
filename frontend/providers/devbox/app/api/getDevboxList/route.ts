import { NextRequest, NextResponse } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export async function GET(req: NextRequest) {
  try {
    // const { k8sCustomObjects, namespace } = await getK8s({
    //   kubeconfig: await authSession(req)
    // })

    // const response: any = await k8sCustomObjects.listNamespacedCustomObject(
    //   'apps.kubeblocks.io',
    //   'v1alpha1',
    //   namespace,
    //   'clusters',
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   `clusterdefinition.kubeblocks.io/name`
    // )

    // return jsonRes<ApiResp>({ data: response?.body?.items })
    return jsonRes<apiResp>({
      data: []
    })
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
