import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { DevboxEditType, runtimeNamespaceMapType } from '@/types/devbox'
import { json2Devbox, json2Ingress, json2Service } from '@/utils/json2Yaml'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { devboxForm, runtimeNamespaceMap } = (await req.json()) as {
      devboxForm: DevboxEditType
      runtimeNamespaceMap: runtimeNamespaceMapType
    }

    const headerList = req.headers

    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { SEALOS_DOMAIN, INGRESS_SECRET, DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE } = process.env
    const devbox = json2Devbox(
      devboxForm,
      runtimeNamespaceMap,
      DEVBOX_AFFINITY_ENABLE,
      SQUASH_ENABLE
    )
    const service = json2Service(devboxForm)
    const ingress = json2Ingress(devboxForm, SEALOS_DOMAIN as string, INGRESS_SECRET as string)

    await applyYamlList([devbox, service, ingress], 'create')

    return jsonRes({
      data: 'success create devbox'
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
