import { NextRequest } from 'next/server'

import { KBDevboxType } from '@/types/k8s'
import { devboxKey } from '@/constants/devbox'
import { KbPgClusterType } from '@/types/cluster'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { getPayloadWithoutVerification, verifyToken } from '@/services/backend/auth'
import { adaptDBListItem, adaptDevboxListItem, adaptIngressListItem } from '@/utils/adapt'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { payload, token } = getPayloadWithoutVerification(req.headers)
    if (!payload || !token) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      })
    }
    const devboxName = payload.devboxName
    const namespace = payload.namespace

    const { k8sCore, k8sCustomObjects, k8sNetworkingApp } = await getK8s({
      useDefaultConfig: true
    })

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace)

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8')

    if (!verifyToken(token, jwtSecret)) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      })
    }

    const results = await Promise.allSettled([
      k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxes',
        devboxName
      ),
      k8sCustomObjects.listNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters'
      ),
      k8sNetworkingApp.listNamespacedIngress(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${devboxKey}=${devboxName}`
      )
    ])

    const [devboxResult, clustersResult, ingressesResult] = results

    let devbox, clusters, ingresses

    if (devboxResult.status === 'fulfilled') {
      devbox = adaptDevboxListItem(devboxResult.value.body as KBDevboxType)
    }

    if (clustersResult.status === 'fulfilled') {
      clusters = (clustersResult.value.body as { items: KbPgClusterType[] }).items.map(
        adaptDBListItem
      )
    }

    if (ingressesResult.status === 'fulfilled') {
      ingresses = ingressesResult.value.body.items.map(adaptIngressListItem)
    }

    return jsonRes({
      data: {
        devbox,
        clusters,
        ingresses
      }
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err?.body || err
    })
  }
}
