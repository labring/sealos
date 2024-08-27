import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { json2DevboxRelease } from '@/utils/json2Yaml'

export async function POST(req: NextRequest) {
  try {
    //TODO: zod later
    const releaseForm = (await req.json()) as {
      devboxName: string
      tag: string
      releaseDes: string
    }
    const headerList = req.headers

    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(headerList)
    })
    const devbox = json2DevboxRelease(releaseForm)
    await applyYamlList([devbox], 'create')

    // TODO: ApiResp的使用不太好，尝试去除
    return jsonRes({
      data: 'success create devbox release'
    })
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
