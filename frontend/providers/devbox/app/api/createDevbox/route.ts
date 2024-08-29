import yaml from 'js-yaml'
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
    const { devboxForm, isEdit } = (await req.json()) as {
      devboxForm: DevboxEditType
      isEdit: boolean
    }
    const headerList = req.headers

    const { applyYamlList, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })
    const devbox = json2Devbox(devboxForm)
    const service = json2Service(devboxForm)
    const ingress = json2Ingress(devboxForm)
    const jsonDevbox = yaml.load(devbox) as object

    if (isEdit) {
      await k8sCustomObjects.patchNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxes',
        devboxForm.name,
        jsonDevbox,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json'
          }
        }
      )
      await applyYamlList([service, ingress], 'update')

      return jsonRes({
        data: 'success update devbox'
      })
    }

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
