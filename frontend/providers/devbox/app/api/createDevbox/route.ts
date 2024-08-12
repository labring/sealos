import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { DevboxEditType } from '@/types/devbox'
import { KbPgClusterType } from '@/types/cluster'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { json2Account, json2CreateCluster } from '@/utils/json2Yaml'

export async function POST(req: NextRequest) {
  try {
    //TODO: zod later
    const { devboxForm } = req.body as unknown as {
      devboxForm: DevboxEditType
    }

    const { k8sCustomObjects, namespace, applyYamlList, delYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    })

    const account = json2Account(devboxForm)
    const cluster = json2CreateCluster(devboxForm)
    await applyYamlList([account, cluster], 'create')
    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      devboxForm.devboxName
    )) as {
      body: KbPgClusterType
    }
    const devboxUid = body.metadata.uid

    const updateAccountYaml = json2Account(devboxForm, devboxUid)

    await applyYamlList([updateAccountYaml], 'replace')

    // TODO: ApiResp的使用不太好，尝试去除
    return jsonRes({
      data: 'success create devbox'
    })
  } catch (err: any) {
    jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
