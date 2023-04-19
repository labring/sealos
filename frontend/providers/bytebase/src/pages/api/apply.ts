import { generateByteBaseTemplate, ByteBaseStatus } from '@/interfaces/bytebase'
import { authSession } from '@/service/auth'
import {
  ApplyYaml,
  CRDMeta,
  GetCRD,
  GetUserDefaultNameSpace,
  K8sApi,
} from '@/service/kubernetes'
import { jsonRes } from '@/service/response'
import type { NextApiRequest, NextApiResponse } from 'next'

export const ByteBaseMeta: CRDMeta = {
  group: 'bytebase.db.sealos.io',
  version: 'v1',
  namespace: 'bytebase-app',
  plural: 'bytebases',
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const kubeconfig = await authSession(req.headers)
    const kc = K8sApi(kubeconfig)

    const kube_user = kc.getCurrentUser()

    if (!kube_user || !kube_user.token || !kube_user.name) {
      throw new Error('kube_user get failed')
    }

    const bytebase_name = 'bytebase-' + kube_user.name
    const namespace = GetUserDefaultNameSpace(kube_user.name)

    // first get user namespace crd
    let bytebase_meta_user = { ...ByteBaseMeta }
    bytebase_meta_user.namespace = namespace

    try {
      // get crd
      const byteBaseUserDesc = await GetCRD(
        kc,
        bytebase_meta_user,
        bytebase_name
      )

      if (byteBaseUserDesc?.body?.status) {
        const bytebaseStatus = byteBaseUserDesc.body.status as ByteBaseStatus
        if (bytebaseStatus.availableReplicas > 0) {
          // temporarily add domain scheme
          return jsonRes(res, { data: bytebaseStatus.domain || '' })
        }
      }
    } catch (error) {
      // console.log(error)
    }

    const ByteBase_yaml = generateByteBaseTemplate({
      namespace: namespace,
      bytebase_name: bytebase_name,
    })
    const result = await ApplyYaml(kc, ByteBase_yaml)
    jsonRes(res, { code: 201, data: result, message: '' })
  } catch (error) {
    // console.log(error)
    jsonRes(res, { code: 500, error })
  }
}
