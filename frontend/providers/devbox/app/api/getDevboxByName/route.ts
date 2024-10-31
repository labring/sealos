import { NextRequest } from 'next/server'

import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { KBDevboxType, KBRuntimeType } from '@/types/k8s'
import { devboxKey, publicDomainKey } from '@/constants/devbox'

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
      ROOT_RUNTIME_NAMESPACE || 'devbox-system',
      'runtimes',
      devboxBody.spec.runtimeRef.name
    )) as { body: KBRuntimeType }

    // add runtimeType, runtimeVersion, runtimeNamespace, networks to devbox yaml
    let resp = {
      ...devboxBody,
      spec: {
        ...devboxBody.spec,
        runtimeType: runtimeBody.spec.classRef
        // NOTE: where use runtimeNamespace
      },
      portInfos: []
    } as KBDevboxType & { portInfos: any[] }

    // get ingresses and certificates
    const [ingressesResponse, certificatesResponse] = await Promise.all([
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
      k8sCustomObjects.listNamespacedCustomObject(
        'cert-manager.io',
        'v1',
        namespace,
        'certificates',
        undefined,
        undefined,
        undefined,
        undefined,
        `${devboxKey}=${devboxName}`
      )
    ])
    const ingresses: any = ingressesResponse.body
    const certificates: any = certificatesResponse.body
    const customDomain = certificates.items[0]?.spec.dnsNames[0]
    const ingressList = ingresses.items.map((item: any) => {
      return {
        networkName: item.metadata.name,
        port: item.spec.rules[0].http.paths[0].backend.service.port.number,
        protocol: item.metadata.annotations['nginx.ingress.kubernetes.io/backend-protocol'],
        openPublicDomain: !!item.metadata.labels[publicDomainKey],
        publicDomain: item.spec.tls[0].hosts[0],
        customDomain: customDomain || ''
      }
    })
    if (devboxBody.spec.network.extraPorts.length !== 0) {
      try {
        const { body: service } = await k8sCore.readNamespacedService(devboxName, namespace)
        const portInfos = devboxBody.spec.network.extraPorts.map(async (network: any) => {
          const matchingIngress = ingressList.find(
            (ingress: any) => ingress.port === network.containerPort
          )

          const servicePort = service.spec?.ports?.find(
            (port: any) => port.port === network.containerPort
          )
          const servicePortName = servicePort?.name

          if (matchingIngress) {
            return {
              networkName: matchingIngress.networkName,
              port: matchingIngress.port,
              portName: servicePortName,
              protocol: matchingIngress.protocol,
              openPublicDomain: matchingIngress.openPublicDomain,
              publicDomain: matchingIngress.publicDomain,
              customDomain: matchingIngress.customDomain
            }
          }

          return {
            ...network,
            port: network.containerPort
          }
        })
        resp.portInfos = await Promise.all(portInfos)
      } catch (error) {
        // no service just null array
        resp.portInfos = []
      }
    }

    return jsonRes({ data: resp })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
