import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'
import { devboxDB } from '@/services/db/init'
import { KBDevboxTypeV2 } from '@/types/k8s'
import { NextRequest } from 'next/server'

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
    )) as { body: KBDevboxTypeV2 }
    const template = await devboxDB.template.findUnique({
      where: {
        uid: devboxBody.spec.templateID,
      },
      select: {
        templateRepository: {
          select: {
            uid: true,
            iconId: true,
            name: true,
            kind: true,
          }
        },
        uid: true,
        image: true,
        name: true,
      }
    })
    if (!template) {
      return jsonRes({
        code: 500,
        error: 'template not found'
      })
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

    const portInfos: any[] = []
    const servicePort = service?.spec?.ports?.[0]
    if (ingressList.length > 0) {
      portInfos.push({
        ...ingressList[0],
        portName: servicePort?.name
      })
    } else {
      portInfos.push({
        ...servicePort
      })
    }
    const resp = [
      devboxBody,
      portInfos,
      template
    ] as const
    return jsonRes({ data: resp })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
