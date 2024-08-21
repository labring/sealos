import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

import { ApiResp } from '@/services/kubernet'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'

export async function GET(req: NextRequest) {
  try {
    const headerList = headers()

    const { namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })
    return jsonRes({ data: namespace })
  } catch (err: any) {
    // TODO: ApiResp全部去除
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    })
  }
}
