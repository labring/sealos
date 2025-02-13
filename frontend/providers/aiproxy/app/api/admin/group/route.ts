import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { parseJwtToken } from '@/utils/backend/auth'
import { isAdmin } from '@/utils/backend/isAdmin'
import { NextRequest, NextResponse } from 'next/server'
import { GroupInfo } from '@/types/admin/group'

export const dynamic = 'force-dynamic'

export type ApiProxyBackendGroupSearchResponse = ApiProxyBackendResp<{
  groups: GroupInfo[]
  total: number
}>

export type GroupSearchResponse = ApiResp<{
  groups: GroupInfo[]
  total: number
}>

export interface GroupQueryParams {
  keyword?: string
  page: number
  perPage: number
}

function validateParams(params: GroupQueryParams): string | null {
  if (params.page < 1) {
    return 'Page number must be greater than 0'
  }
  if (params.perPage < 1 || params.perPage > 100) {
    return 'Per page must be between 1 and 100'
  }
  return null
}

async function fetchGroups(
  params: GroupQueryParams
): Promise<{ groups: GroupInfo[]; total: number }> {
  try {
    const url = new URL(
      `/api/groups/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    url.searchParams.append('p', params.page.toString())
    url.searchParams.append('per_page', params.perPage.toString())

    if (params.keyword) {
      url.searchParams.append('keyword', params.keyword)
    }

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

    const result: ApiProxyBackendGroupSearchResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return {
      groups: result.data?.groups || [],
      total: result.data?.total || 0
    }
  } catch (error) {
    console.error('Error fetching groups:', error)
    throw error
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GroupSearchResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)
    const searchParams = request.nextUrl.searchParams

    const queryParams: GroupQueryParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: parseInt(searchParams.get('perPage') || '10', 10),
      keyword: searchParams.get('keyword') || undefined
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

    const { groups, total } = await fetchGroups(queryParams)

    return NextResponse.json({
      code: 200,
      data: {
        groups,
        total
      }
    } satisfies GroupSearchResponse)
  } catch (error) {
    console.error('Groups search error:', error)
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
