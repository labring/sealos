import { NextRequest } from 'next/server'

import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers

    const { namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    return jsonRes({ data: namespace })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
