import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { DevboxEditType } from '@/types/devbox'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { json2Devbox } from '@/utils/json2Yaml'

export async function POST(req: NextRequest) {
  try {
    //TODO: zod later
    const { devboxForm, isEdit } = (await req.json()) as {
      devboxForm: DevboxEditType
      isEdit: boolean
    }

    const { applyYamlList, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(req)
    })

    if (isEdit) {
      await k8sCustomObjects.patchNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        'default', // TODO: namespace动态获取
        'devboxes',
        devboxForm.name,
        {
          metadata: {
            name: devboxForm.name
          },
          spec: {
            network: {
              type: 'NodePort',
              extraPorts: [
                {
                  containerPort: 8080,
                  hostPort: 8080,
                  protocol: 'TCP'
                }
              ]
            },
            resource: {
              cpu: devboxForm.cpu,
              memory: devboxForm.memory
            },
            runtimeRef: {
              name: `${devboxForm.runtimeType}-${devboxForm.runtimeVersion}`
            }
          }
        },
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json'
          }
        }
      )
      return jsonRes({
        data: 'success update devbox'
      })
    }

    const devbox = json2Devbox(devboxForm)
    await applyYamlList([devbox], 'create')

    // TODO: ApiResp的使用不太好，尝试去除
    return jsonRes({
      data: 'success create devbox'
    })
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
