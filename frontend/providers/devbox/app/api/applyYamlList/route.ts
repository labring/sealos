import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export async function POST(req: NextRequest) {
  // TODO: zod later
  const { yamlList, type = 'create' } = req.body as unknown as {
    yamlList: string[]
    type?: 'create' | 'replace' | 'update'
  }

  if (!yamlList) {
    jsonRes<ApiResp>({
      code: 500,
      error: 'params error'
    })
    return
  }

  try {
    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    })

    await applyYamlList(yamlList, type)

    return jsonRes<ApiResp>({})
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
