import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { devboxName } = (await req.json()) as { devboxName: string }
    const headerList = req.headers

    const { namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    // restart = stopped + running

    // 1. stopped
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pauseDevbox`, {
      method: 'POST',
      headers: {
        ...Object.fromEntries(req.headers),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ devboxName })
    })

    // 2.get devbox pod and ensure the devbox pod is deleted,when the devbox pod is deleted,the devbox will be restarted
    let pods
    const maxRetries = 10
    let retries = 0

    do {
      const {
        body: { items }
      } = await k8sCore.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app.kubernetes.io/name=${devboxName}`
      )
      pods = items

      if (pods.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      retries++
    } while (pods.length > 0 && retries < maxRetries)

    if (retries === maxRetries) {
      throw new Error('Max retries reached while waiting for devbox pod to be deleted')
    }
    console.log('devbox pod is deleted')

    // 3. running
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/startDevbox`, {
      method: 'POST',
      headers: {
        ...Object.fromEntries(req.headers),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ devboxName })
    })

    return jsonRes({
      data: 'success pause devbox'
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
