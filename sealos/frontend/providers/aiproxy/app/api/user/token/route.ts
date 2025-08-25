import { NextRequest, NextResponse } from 'next/server'
import { TokenInfo } from '@/types/user/token'

import { checkSealosUserIsRealName, parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'

export const dynamic = 'force-dynamic'

type ApiProxyBackendTokenSearchResponse = ApiProxyBackendResp<{
  tokens: TokenInfo[]
  total: number
}>

export type GetTokensResponse = ApiResp<{
  tokens: TokenInfo[]
  total: number
}>

export interface GetTokensQueryParams {
  page: number
  perPage: number
}

function validateParams(queryParams: GetTokensQueryParams): string | null {
  if (queryParams.page < 1) {
    return 'Page number must be greater than 0'
  }

  if (queryParams.perPage < 1 || queryParams.perPage > 100) {
    return 'Per page must be between 1 and 100'
  }

  return null
}

async function fetchTokens(
  queryParams: GetTokensQueryParams,
  group: string
): Promise<{ tokens: TokenInfo[]; total: number }> {
  try {
    const url = new URL(
      `/api/token/${group}/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    url.searchParams.append('p', queryParams.page.toString())
    url.searchParams.append('per_page', queryParams.perPage.toString())

    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendTokenSearchResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return {
      tokens: result?.data?.tokens || [],
      total: result?.data?.total || 0
    }
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return {
      tokens: [],
      total: 0
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GetTokensResponse>> {
  try {
    const group = await parseJwtToken(request.headers)

    const searchParams = request.nextUrl.searchParams
    const queryParams: GetTokensQueryParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: parseInt(searchParams.get('perPage') || '10', 10)
    }

    const validationError = validateParams(queryParams)

    if (validationError) {
      return NextResponse.json(
        {
          code: 400,
          message: validationError,
          error: validationError
        },
        { status: 400 }
      )
    }

    const { tokens, total } = await fetchTokens(queryParams, group)

    return NextResponse.json({
      code: 200,
      data: {
        tokens,
        total
      }
    } satisfies GetTokensResponse)
  } catch (error) {
    console.error('Token search error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// create token

interface CreateTokenRequest {
  name: string
}

function validateCreateParams(body: CreateTokenRequest): string | null {
  if (!body.name) {
    return 'Name parameter is required'
  }
  return null
}

async function createToken(name: string, group: string): Promise<TokenInfo | undefined> {
  try {
    const url = new URL(
      `/api/token/${group}?auto_create_group=true`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      cache: 'no-store',
      body: JSON.stringify({
        name
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp<TokenInfo> = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to create token')
    }

    return result?.data
  } catch (error) {
    console.error('Error creating token:', error)
    throw error
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResp<TokenInfo>>> {
  try {
    const group = await parseJwtToken(request.headers)
    const body: CreateTokenRequest = await request.json()

    const validationError = validateCreateParams(body)
    if (validationError) {
      return NextResponse.json(
        {
          code: 400,
          message: validationError,
          error: validationError
        } satisfies ApiResp<TokenInfo>,
        { status: 400 }
      )
    }

    const isRealName = await checkSealosUserIsRealName(request.headers)

    if (!isRealName) {
      return NextResponse.json(
        {
          code: 400,
          message: 'key.userNotRealName',
          error: 'key.userNotRealName'
        },
        { status: 400 }
      )
    }
    // 创建Token
    const newToken = await createToken(body.name, group)

    return NextResponse.json({
      code: 200,
      data: newToken,
      message: 'Token created successfully'
    } satisfies ApiResp<TokenInfo>)
  } catch (error) {
    console.error('Token creation error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      } satisfies ApiResp<TokenInfo>,
      { status: 500 }
    )
  }
}
