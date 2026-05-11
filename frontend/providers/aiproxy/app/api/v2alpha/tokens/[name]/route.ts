import { NextRequest, NextResponse } from 'next/server'

import { ErrorCode, ErrorType, sendError, sendValidationError } from '@/lib/v2alpha/error'
import { findTokenByName } from '@/lib/v2alpha/tokens'
import { ApiProxyBackendResp } from '@/types/api.d'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'

import { tokenNameParamSchema } from './schema'

export const dynamic = 'force-dynamic'

async function deleteTokenInBackend(name: string, group: string): Promise<void> {
  const baseUrl = global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  if (!baseUrl) {
    throw new Error('Backend service URL is not configured')
  }

  const authKey = global.AppConfig?.auth.aiProxyBackendKey
  if (!authKey) {
    throw new Error('Backend auth key is not configured')
  }

  const tokenInfo = await findTokenByName(name, group)

  if (!tokenInfo) {
    return
  }

  const url = new URL(`/api/token/${group}/${tokenInfo.id}`, baseUrl)

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authKey,
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    throw new Error('Token not found')
  }

  if (response.status === 204) {
    return
  }

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(responseText || `HTTP error! status: ${response.status}`)
  }

  if (!responseText) {
    return
  }

  const result: ApiProxyBackendResp = JSON.parse(responseText)
  if (!result.success) {
    throw new Error(result.message || 'Failed to delete token')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
): Promise<NextResponse> {
  try {
    const group = await kcOrAppTokenAuthDecoded(request.headers)

    const validationResult = tokenNameParamSchema.safeParse(params)
    if (!validationResult.success) {
      return sendValidationError(validationResult.error, 'Invalid token name.')
    }

    const { name } = validationResult.data
    const token = await findTokenByName(name, group)

    if (!token) {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'The specified token does not exist.',
      })
    }

    return NextResponse.json(token, { status: 200 })
  } catch (error) {
    console.error('Token get error:', error)

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
      message: 'Failed to get token.',
      details: errorMessage,
    })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
): Promise<NextResponse> {
  try {
    const group = await kcOrAppTokenAuthDecoded(request.headers)

    const validationResult = tokenNameParamSchema.safeParse(params)
    if (!validationResult.success) {
      return sendValidationError(validationResult.error, 'Invalid token name.')
    }

    const { name } = validationResult.data

    await deleteTokenInBackend(name, group)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Token deletion error:', error)

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
      message: 'Failed to delete token.',
      details: errorMessage,
    })
  }
}
