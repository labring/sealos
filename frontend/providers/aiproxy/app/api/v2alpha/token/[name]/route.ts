import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'
import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/lib/v2alpha/error'

import { tokenNameParamSchema } from './schema'

export const dynamic = 'force-dynamic'

type TokenSearchResponse = {
  tokens: TokenInfo[]
  total: number
}

async function findTokenByName(name: string, group: string): Promise<TokenInfo | null> {
  const baseUrl = global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  if (!baseUrl) {
    throw new Error('Backend service URL is not configured')
  }

  const authKey = global.AppConfig?.auth.aiProxyBackendKey
  if (!authKey) {
    throw new Error('Backend auth key is not configured')
  }

  try {
    const url = new URL(`/api/token/${group}/search`, baseUrl)
    url.searchParams.append('name', name)
    // Use a large per_page to ensure all tokens matching the (potentially fuzzy)
    // name query are returned so that client-side exact filtering can find the target.
    url.searchParams.append('per_page', '100')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authKey,
      },
      cache: 'no-store',
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp<TokenSearchResponse> = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to search token')
    }

    const foundToken = result.data?.tokens?.find((tokenInfo) => tokenInfo.name === name)

    return foundToken ?? null
  } catch (error) {
    console.error('Error searching token:', error)
    throw error
  }
}

async function deleteTokenInBackend(name: string, group: string): Promise<void> {
  const baseUrl = global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  if (!baseUrl) {
    throw new Error('Backend service URL is not configured')
  }

  const authKey = global.AppConfig?.auth.aiProxyBackendKey
  if (!authKey) {
    throw new Error('Backend auth key is not configured')
  }

  try {
    const tokenInfo = await findTokenByName(name, group)

    if (!tokenInfo) {
      throw new Error('Token not found')
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
  } catch (error) {
    console.error('Error deleting token:', error)
    throw error
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

    try {
      await deleteTokenInBackend(name, group)
    } catch (error) {
      if (error instanceof Error && error.message === 'Token not found') {
        return sendError({
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: 'The specified token does not exist.',
        })
      }
      throw error
    }

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
