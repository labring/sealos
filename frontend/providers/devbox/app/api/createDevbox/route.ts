import { NextRequest } from 'next/server'

import { DevboxEditType } from '@/types/devbox'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { json2Devbox, json2Ingress, json2Service } from '@/utils/json2Yaml'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    //TODO: zod later
    const { devboxForm, runtimeNamespaceMap } = (await req.json()) as {
      devboxForm: DevboxEditType
      runtimeNamespaceMap: { [key: string]: string }
    }

    const headerList = req.headers

    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { SEALOS_DOMAIN, INGRESS_SECRET } = process.env
    const devbox = json2Devbox(devboxForm, runtimeNamespaceMap)
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
