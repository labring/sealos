import type { NextRequest } from 'next/server'

import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'

export async function GET(req: NextRequest) {
  try {
    // const { getUserQuota } = await getK8s({
    //   kubeconfig: await authSession(req)
    // })

    // const quota = await getUserQuota()

    // return jsonRes({
    //   data: {
    //     quota
    //   }
    // })
    return jsonRes({
      data: {
        quota: [
          {
            type: 'cpu',
            used: 0.1,
            limit: 1
          },
          {
            type: 'memory',
            used: 0.2,
            limit: 1
          }
        ]
      }
    })
  } catch (error) {
    console.log(error)
    jsonRes({ code: 500, message: 'get price error' })
  }
}
