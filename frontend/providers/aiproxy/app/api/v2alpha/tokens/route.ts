import { NextRequest, NextResponse } from 'next/server'

import { ErrorCode, ErrorType, sendError, sendValidationError } from '@/lib/v2alpha/error'
import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'

import { createTokenBodySchema, listTokensQuerySchema } from './schema'

export const dynamic = 'force-dynamic'

type ListTokensResponse = {
  tokens: TokenInfo[]
  total: number
}

async function listTokensFromBackend(
  group: string,
  name?: string,
  page: number = 1,
  perPage: number = 10
): Promise<ListTokensResponse> {
  const baseUrl = global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  if (!baseUrl) {
    throw new Error('Backend service URL is not configured')
  }

  const authKey = global.AppConfig?.auth.aiProxyBackendKey
  if (!authKey) {
    throw new Error('Backend auth key is not configured')
  }

  const url = new URL(`/api/token/${group}/search`, baseUrl)

  if (name) {
    url.searchParams.append('name', name)
  }
  url.searchParams.append('p', String(page))
  url.searchParams.append('per_page', String(perPage))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authKey,
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    return { tokens: [], total: 0 }
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result: ApiProxyBackendResp<{ tokens: TokenInfo[]; total: number }> = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to list tokens')
  }

  return {
    tokens: result?.data?.tokens || [],
    total: result?.data?.total || 0,
  }
}

async function createTokenInBackend(name: string, group: string): Promise<TokenInfo> {
  const baseUrl = global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  if (!baseUrl) {
    throw new Error('Backend service URL is not configured')
  }

  const authKey = global.AppConfig?.auth.aiProxyBackendKey
  if (!authKey) {
    throw new Error('Backend auth key is not configured')
  }

  const url = new URL(`/api/token/${group}?auto_create_group=true&ignore_exist=true`, baseUrl)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authKey,
    },
    cache: 'no-store',
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result: ApiProxyBackendResp<TokenInfo> = await response.json()
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Failed to create token')
  }

  return result.data
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const group = await kcOrAppTokenAuthDecoded(request.headers)
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      name: searchParams.get('name') || undefined,
      page: searchParams.get('page') ?? undefined,
      perPage: searchParams.get('perPage') ?? undefined,
    }

    const validationResult = listTokensQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return sendValidationError(validationResult.error, 'Invalid query parameters.')
    }

    const { name, page, perPage } = validationResult.data
    const result = await listTokensFromBackend(group, name, page, perPage)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Token list error:', error)

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
      message: 'Failed to list tokens.',
      details: errorMessage,
    })
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

    const { name } = validationResult.data
    // The backend uses ignore_exist=true: if a token with this name already exists it is
    // returned as-is rather than producing an error. Always return 201 — callers can tell
    // whether the key is fresh by whether it is masked (sk-****...) or not.
    const token = await createTokenInBackend(name, group)
    return NextResponse.json(token, { status: 201 })
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
