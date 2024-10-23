import { NextRequest } from 'next/server'

import type { Env } from '@/types/static'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { authSession } from '@/services/backend/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers

    const { namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    return jsonRes<Env>({
      data: {
        sealosDomain: process.env.SEALOS_DOMAIN || 'dev.sealos.plus',
        ingressSecret: process.env.INGRESS_SECRET || 'wildcard-cert',
        registryAddr: process.env.REGISTRY_ADDR || 'hub.dev.sealos.plus',
        devboxAffinityEnable: process.env.DEVBOX_AFFINITY_ENABLE || 'true',
        squashEnable: process.env.SQUASH_ENABLE || 'false',
        namespace: namespace || 'default',
        rootRuntimeNamespace: process.env.ROOT_RUNTIME_NAMESPACE || 'devbox-system',
        ingressDomain: process.env.INGRESS_DOMAIN || 'sealosusw.site'
      }
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
