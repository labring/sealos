import { NextRequest } from 'next/server'

import { KBDevboxType } from '@/types/k8s'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { getPayloadWithoutVerification, verifyToken } from '@/services/backend/auth'
import { adaptDevboxListItem } from '@/utils/adapt'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { payload, token } = getPayloadWithoutVerification(req.headers)
    if (!payload || !token) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      })
    }
    const devboxName = payload.devboxName
    const namespace = payload.namespace

    const { k8sCore, k8sCustomObjects } = await getK8s({
      kubeconfig:
        process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '',
      useDefaultConfig: process.env.NODE_ENV !== 'development'
    })

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace)

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8')

    if (!verifyToken(token, jwtSecret)) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      })
    }

    const devboxResult = await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    )

    const devbox = adaptDevboxListItem(devboxResult.body as KBDevboxType)

    return jsonRes({
      data: {
        devbox
      }
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err?.body || err
    })
  }
}
