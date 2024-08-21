import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'

export async function GET(req: NextRequest) {
  try {
    const headerList = headers()
    const { searchParams } = req.nextUrl
    const runtimeName = searchParams.get('runtimeName')

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const response: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default',
      'runtimes'
    )
    const data = response?.body?.items.filter((item: any) => item.spec.classRef === runtimeName)

    return jsonRes({
      data
    })
  } catch (error) {
    return jsonRes({
      code: 500,
      error: error
    })
  }
}
