import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'
import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/lib/v2alpha/error'

import { createTokenBodySchema } from './schema'

export const dynamic = 'force-dynamic'

class TokenAlreadyExistsError extends Error {
  constructor() {
    super('Token already exists')
    this.name = 'TokenAlreadyExistsError'
  }
}

async function createTokenInBackend(name: string, group: string): Promise<void> {
  const baseUrl = global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  if (!baseUrl) {
    throw new Error('Backend service URL is not configured')
  }

  const url = new URL(`/api/token/${group}?auto_create_group=true&ignore_exist=true`, baseUrl)

  const authKey = global.AppConfig?.auth.aiProxyBackendKey
  if (!authKey) {
    throw new Error('Backend auth key is not configured')
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authKey,
    },
    cache: 'no-store',
    body: JSON.stringify({ name }),
  })

  if (response.status === 409) {
    throw new TokenAlreadyExistsError()
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result: ApiProxyBackendResp<TokenInfo> = await response.json()
  if (!result.success) {
    throw new Error(result.message || 'Failed to create token')
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const group = await kcOrAppTokenAuthDecoded(request.headers)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return sendError({
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Request body must be valid JSON.',
      })
    }

    const validationResult = createTokenBodySchema.safeParse(body)
    if (!validationResult.success) {
      return sendValidationError(validationResult.error, 'Invalid request body.')
    }

    try {
      await createTokenInBackend(validationResult.data.name, group)
    } catch (error) {
      if (error instanceof TokenAlreadyExistsError) {
        return sendError({
          status: 409,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.ALREADY_EXISTS,
          message: 'A token with this name already exists.',
        })
      }
      throw error
    }

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
