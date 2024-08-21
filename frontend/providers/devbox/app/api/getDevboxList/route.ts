import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'

export async function GET(req: NextRequest) {
  try {
    const headerList = headers()

    const { k8sCustomObjects, namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const devboxRes: any = await k8sCustomObjects.listNamespacedCustomObject(
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

    const ingressRes: any = await k8sCustomObjects.listNamespacedCustomObject(
      'networking.k8s.io',
      'v1',
      'default', // TODO: namespace动态获取
      'ingresses'
    )
    const serviceRes = await k8sCore.listNamespacedService('default')

    const res = devboxRes.body.items.map((item: any) => {
      item.networks = item.spec.network.extraPorts.map((port: any) => {})
    })

    return jsonRes<ApiResp>({ data: devboxRes.body.items })
  } catch (err: any) {
    // TODO: ApiResp全部去除
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
