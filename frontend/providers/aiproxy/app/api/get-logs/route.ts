import { LogItem } from '@/types/log'
import { parseJwtToken } from '@/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export interface SearchResponse {
  data: {
    logs: LogItem[]
    total: number
  }
  message: string
  success: boolean
}

export interface QueryParams {
  token_name?: string
  model_name?: string
  code?: string
  start_timestamp?: string
  end_timestamp?: string
  page: number
  perPage: number
}

function validateParams(params: QueryParams): string | null {
  if (params.page < 1) {
    return 'Page number must be greater than 0'
  }
  if (params.perPage < 1 || params.perPage > 100) {
    return 'Per page must be between 1 and 100'
  }
  if (params.start_timestamp && params.end_timestamp) {
    if (parseInt(params.start_timestamp) > parseInt(params.end_timestamp)) {
      return 'Start timestamp cannot be greater than end timestamp'
    }
  }
  return null
}

async function fetchLogs(
  params: QueryParams,
  group: string
): Promise<{ logs: LogItem[]; total: number }> {
  try {
    const url = new URL(
      `/api/log/${group}/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    url.searchParams.append('p', params.page.toString())
    url.searchParams.append('per_page', params.perPage.toString())

    if (params.token_name) {
      url.searchParams.append('token_name', params.token_name)
    }
    if (params.model_name) {
      url.searchParams.append('model_name', params.model_name)
    }
    if (params.code) {
      url.searchParams.append('code', params.code)
    }
    if (params.start_timestamp) {
      url.searchParams.append('start_timestamp', params.start_timestamp)
    }
    if (params.end_timestamp) {
      url.searchParams.append('end_timestamp', params.end_timestamp)
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

    const result: SearchResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return {
      logs: result.data.logs,
      total: result.data.total
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
    throw error
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const group = await parseJwtToken(request.headers)
    const searchParams = request.nextUrl.searchParams

    const queryParams: QueryParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: parseInt(searchParams.get('perPage') || '10', 10),
      token_name: searchParams.get('token_name') || undefined,
      model_name: searchParams.get('model_name') || undefined,
      code: searchParams.get('code') || undefined,
      start_timestamp: searchParams.get('start_timestamp') || undefined,
      end_timestamp: searchParams.get('end_timestamp') || undefined
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

    const { logs, total } = await fetchLogs(queryParams, group)

    return NextResponse.json({
      code: 200,
      data: {
        logs,
        total
      }
    })
  } catch (error) {
    console.error('Logs search error:', error)
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
