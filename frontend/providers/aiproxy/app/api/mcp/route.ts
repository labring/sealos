import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { Mcp } from '@/types/mcp'
import { kcOrAppTokenAuth, parseJwtToken } from '@/utils/backend/auth'

export const dynamic = 'force-dynamic'

type ApiProxyBackendMcpListResponse = ApiProxyBackendResp<{
  mcps: Mcp[]
  total: number
}>

export type GetMcpListResponse = ApiResp<{
  mcps: Mcp[]
  total: number
}>

export interface GetMcpListQueryParams {
  page: number
  perPage: number
  type: 'hosted' | 'local' | ''
  keyword: string
}

function validateParams(queryParams: GetMcpListQueryParams): string | null {
  if (queryParams.page < 1) {
    return 'Page number must be greater than 0'
  }

  if (queryParams.perPage < 1 || queryParams.perPage > 100) {
    return 'Per page must be between 1 and 100'
  }

  return null
}

async function fetchMcpList(
  queryParams: GetMcpListQueryParams,
  group: string
): Promise<{ mcps: Mcp[]; total: number }> {
  try {
    const url = new URL(
      `/api/group/${group}/mcp`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    url.searchParams.append('p', queryParams.page.toString())
    url.searchParams.append('per_page', queryParams.perPage.toString())
    if (queryParams.type) {
      url.searchParams.append('type', queryParams.type)
    }
    if (queryParams.keyword) {
      url.searchParams.append('keyword', queryParams.keyword)
    }

    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendMcpListResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return result.data!
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return {
      mcps: [],
      total: 0,
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GetMcpListResponse>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)

    const searchParams = request.nextUrl.searchParams
    const queryParams: GetMcpListQueryParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: parseInt(searchParams.get('perPage') || '10', 10),
      type: (searchParams.get('type') as 'hosted' | 'local' | '') || '',
      keyword: searchParams.get('keyword') || '',
    }

    const validationError = validateParams(queryParams)

    if (validationError) {
      return NextResponse.json(
        {
          code: 400,
          message: validationError,
          error: validationError,
        },
        { status: 400 }
      )
    }

    const data = await fetchMcpList(queryParams, group)

    return NextResponse.json({
      code: 200,
      data,
    } satisfies GetMcpListResponse)
  } catch (error) {
    console.error('Token search error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
