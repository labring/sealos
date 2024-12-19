import { NextRequest } from 'next/server'

import { defaultEnv } from '@/stores/env'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { KBDevboxType, KBRuntimeType } from '@/types/k8s'
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers
    const { ROOT_RUNTIME_NAMESPACE } = process.env

    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName') as string

    if (!devboxName) {
      return jsonRes({
        code: 400,
        error: 'devboxName is required'
      })
    }

    const { k8sCustomObjects, namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxType }
    const { body: runtimeBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      ROOT_RUNTIME_NAMESPACE || defaultEnv.rootRuntimeNamespace,
      'runtimes',
      devboxBody.spec.runtimeRef.name
    )) as { body: KBRuntimeType }

    // add runtimeType, runtimeVersion, networks to devbox yaml
    let resp = {
      ...devboxBody,
      spec: {
        ...devboxBody.spec,
        runtimeType: runtimeBody.spec.classRef
      },
      portInfos: []
    } as KBDevboxType & { portInfos: any[] }

    if (devboxBody.spec.network.extraPorts.length === 0) {
      return jsonRes({ data: resp })
    }

    // get ingresses and service
    const [ingressesResponse, serviceResponse] = await Promise.all([
      k8sCustomObjects.listNamespacedCustomObject(
        'networking.k8s.io',
        'v1',
        namespace,
        'ingresses',
        undefined,
        undefined,
        undefined,
        undefined,
        `${devboxKey}=${devboxName}`
      ),
      k8sCore.readNamespacedService(devboxName, namespace).catch(() => null)
    ])

    const ingresses: any = (ingressesResponse.body as { items: any[] }).items
    const service = serviceResponse?.body

    const ingressList = ingresses.map((item: any) => {
      const defaultDomain = item.metadata.labels[publicDomainKey]
      const tlsHost = item.spec.tls[0].hosts[0]

      return {
        networkName: item.metadata.name,
        port: item.spec.rules[0].http.paths[0].backend.service.port.number,
        protocol: item.metadata.annotations[ingressProtocolKey],
        openPublicDomain: !!item.metadata.labels[publicDomainKey],
        publicDomain: defaultDomain === tlsHost ? tlsHost : defaultDomain,
        customDomain: defaultDomain === tlsHost ? '' : tlsHost
      }
    })

    // Either svc or ingress exist.
    resp.portInfos =
      service?.spec?.ports?.map((port: any) => {
        const matchingIngress = ingressList.find((ingress: any) => ingress.port === port.port)
        const servicePortName = port.name

        if (matchingIngress) {
          return {
            ...matchingIngress,
            portName: servicePortName
          }
        }

        return {
          portName: servicePortName
        }
      }) || []

    return jsonRes({ data: resp })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
