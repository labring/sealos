import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { devboxKey, publicDomainKey } from '@/constants/devbox'

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

    const { body: runtimeBody }: any = await k8sCustomObjects.listClusterCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'runtimes'
    )

    // 对devboxBody进行处理，增加运行时和网络的一些字段
    const res = devboxBody.items.map(async (item: any) => {
      const devboxName = item.metadata.name
      const runtimeName = item.spec.runtimeRef.name
      const runtime = runtimeBody.items.find((item: any) => item.metadata.name === runtimeName)

      item.spec.runtimeType = runtime?.spec.classRef
      item.spec.runtimeVersion = runtime?.metadata.name

      const { body: ingresses }: any = await k8sCustomObjects.listNamespacedCustomObject(
        'networking.k8s.io',
        'v1',
        'default',
        'ingresses',
        undefined,
        undefined,
        undefined,
        undefined,
        `${devboxKey}=${devboxName}`
      )
      const { body: certificates }: any = await k8sCustomObjects.listNamespacedCustomObject(
        'cert-manager.io',
        'v1',
        'default',
        'certificates',
        undefined,
        undefined,
        undefined,
        undefined,
        `${devboxKey}=${devboxName}`
      )
      const customDomain = certificates.items[0]?.spec.dnsNames[0]
      const ingressList = ingresses.items.map((item: any) => {
        return {
          networkName: item.metadata.name,
          port: item.spec.rules[0].http.paths[0].backend.service.port.number,
          protocol: item.metadata.annotations['nginx.ingress.kubernetes.io/backend-protocol'],
          openPublicDomain: !!item.metadata.labels[publicDomainKey],
          publicDomain: item.metadata.labels[publicDomainKey],
          customDomain: customDomain || ''
        }
      })

      item.networks = item.spec.network.extraPorts.map((network: any) => {
        const matchingIngress = ingressList.find(
          (ingress: any) => ingress.port === network.hostPort
        )

        if (matchingIngress) {
          return {
            networkName: matchingIngress.networkName,
            port: matchingIngress.port,
            protocol: matchingIngress.protocol,
            openPublicDomain: matchingIngress.openPublicDomain,
            publicDomain: matchingIngress.publicDomain,
            customDomain: matchingIngress.customDomain
          }
        }

        return network
      })
      return item
    })
    const resp = await Promise.all(res)

    return jsonRes({ data: resp })
  } catch (err: any) {
    // TODO: ApiResp全部去除
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
