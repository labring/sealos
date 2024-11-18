import { NextRequest, NextResponse } from 'next/server'
import { TokenInfo } from '@/types/getKeys'

import { parseJwtToken } from '@/utils/auth'

export const dynamic = 'force-dynamic'
export interface KeysSearchResponse {
  data: {
    tokens: TokenInfo[]
    total: number
  }
  message: string
  success: boolean
}

export interface QueryParams {
  page: number
  perPage: number
}

function validateParams(page: number, perPage: number): string | null {
  if (page < 1) {
    return 'Page number must be greater than 0'
  }

  if (perPage < 1 || perPage > 100) {
    return 'Per page must be between 1 and 100'
  }

  return null
}

async function fetchTokens(
  page: number,
  perPage: number,
  group: string
): Promise<{ tokens: TokenInfo[]; total: number }> {
  try {
    const url = new URL(
      `/api/token/${group}/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    url.searchParams.append('p', page.toString())
    url.searchParams.append('per_page', perPage.toString())

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

    const result: KeysSearchResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return {
      tokens: result.data.tokens.sort((a, b) => a.name.localeCompare(b.name)),
      total: result.data.total
    }
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return {
      tokens: [],
      total: 0
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const group = await parseJwtToken(request.headers)

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('perPage') || '10', 10)

    const validationError = validateParams(page, perPage)
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

    const { tokens, total } = await fetchTokens(page, perPage, group)

    return NextResponse.json({
      code: 200,
      data: {
        tokens,
        total
      }
    })
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
