import { NextRequest, NextResponse } from 'next/server'

import { validateCreateParams } from '@/app/api/user/token/route'
import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'

export const dynamic = 'force-dynamic'

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
    // get namespace from kubeconfig or workspaceId from JWT token
    const group = await kcOrAppTokenAuthDecoded(request.headers)

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

    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.startsWith('Auth:')) {
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 401 }
      )
    }

    return new NextResponse(null, { status: 500 })
  }
}

