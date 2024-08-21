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

    const { body: devboxBody }: any = await k8sCustomObjects.listNamespacedCustomObject(
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
    const { body: serviceBody } = await k8sCore.listNamespacedService('default')

    const { body: runtimeBody }: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default',
      'runtimes'
    )

    // 对devboxBody进行处理，增加运行时和网络的一些字段
    const res = devboxBody.items.map(async (item: any) => {
      const devboxName = item.metadata.name
      const runtimeName = item.spec.runtimeRef.name
      const runtime = runtimeBody.items.find((item: any) => item.metadata.name === runtimeName)
      item.spec.runtimeType = runtime?.spec.classRef
      item.spec.runtimeVersion = runtime?.spec.name

      const ingress = await k8sCustomObjects.getNamespacedCustomObject(
        'networking.k8s.io',
        'v1',
        'default',
        'ingresses',
        devboxName
      )
      // TODO: 解决不了
      item.networks = item.spec.network.extraPorts.map((item: any) => {
        return {
          networkName: item.name
        }
      })
      return item
    })

    return jsonRes<ApiResp>({ data: res })
  } catch (err: any) {
    // TODO: ApiResp全部去除
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
