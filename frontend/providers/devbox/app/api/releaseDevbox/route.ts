import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { json2DevboxRelease } from '@/utils/json2Yaml'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const releaseForm = (await req.json()) as {
      devboxName: string
      tag: string
      releaseDes: string
      devboxUid: string
    }
    const headerList = req.headers

    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(headerList)
    })
    const devbox = json2DevboxRelease(releaseForm)
    await applyYamlList([devbox], 'create')

    return jsonRes({
      data: 'success create devbox release'
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
