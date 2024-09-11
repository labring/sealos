import { NextRequest } from 'next/server'

import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'
import { KBDevboxReleaseType } from '../../../types/k8s'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const devboxName = searchParams.get('devboxName')
    const headerList = req.headers

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { body: releaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxreleases'
    )) as { body: { items: KBDevboxReleaseType[] } }

    const matchingDevboxVersions = releaseBody.items.filter((item: any) => {
      return item.spec && item.spec.devboxName === devboxName
    })

    // console.log('matchingDevboxVersions', matchingDevboxVersions)
    return jsonRes({ data: matchingDevboxVersions })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
