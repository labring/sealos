import { NextRequest, NextResponse } from 'next/server'

import { validateCreateParams } from '@/app/api/user/token/route'
import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'
import { sendError, ErrorType, ErrorCode } from '@/lib/v2alpha/error'

export const dynamic = 'force-dynamic'

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
    const group = await kcOrAppTokenAuthDecoded(request.headers)

    const body = await request.json()

    const validationError = validateCreateParams(body)
    if (validationError) {
      return sendError({
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: validationError,
      })
    }

    await createTokenInBackend(body.name, group)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Token creation error:', error)

    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.startsWith('Auth:')) {
      return sendError({
        status: 401,
        type: ErrorType.AUTHENTICATION_ERROR,
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message: 'Unauthorized, please login again.',
        details: errorMessage,
      })
    }

    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to create token.',
      details: errorMessage,
    })
  }
}
