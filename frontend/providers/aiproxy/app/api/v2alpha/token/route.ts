import { NextRequest, NextResponse } from 'next/server'

import { validateCreateParams } from '@/app/api/user/token/route'
import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { getNamespaceFromKubeConfigString } from '@/utils/backend/check-kc'

export const dynamic = 'force-dynamic'
// decode kubeconfig
async function authSession(headers: Headers): Promise<string> {
  if (!headers) {
    throw new Error('Auth: Headers are missing')
  }

  const authorization = headers.get('Authorization')

  if (!authorization) {
    throw new Error('Auth: Authorization header is missing')
  }

  try {
    const kubeConfig = decodeURIComponent(authorization)
    const namespace = getNamespaceFromKubeConfigString(kubeConfig)
    return namespace
  } catch (err) {
    console.error('Auth: Failed to parse kubeconfig:', err)
    throw new Error('Auth: Invalid kubeconfig')
  }
}

// create token—后
async function createTokenInBackend(name: string, group: string): Promise<'created' | 'exists'> {
  const url = new URL(
    `/api/token/${group}?auto_create_group=true&ignore_exist=true`,
    global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  )
  const token = global.AppConfig?.auth.aiProxyBackendKey

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
    cache: 'no-store',
    body: JSON.stringify({
      name,
    }),
  })

  if (response.status === 409) {
    return 'exists'
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result: ApiProxyBackendResp<TokenInfo> = await response.json()
  if (!result.success) {
    throw new Error(result.message || 'Failed to create token')
  }

  return 'created'
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // get namespace from kubeconfig
    const group = await authSession(request.headers)

    const body = await request.json()

    const validationError = validateCreateParams(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // create aiproxy token
    await createTokenInBackend(body.name, group)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Token creation error:', error)

    if (error instanceof Error) {
      if (error.message.startsWith('Auth:')) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 401 }
        )
      }
    }

    return new NextResponse(null, { status: 500 })
  }
}

