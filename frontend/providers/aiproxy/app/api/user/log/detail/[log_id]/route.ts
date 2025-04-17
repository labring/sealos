import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { RequestDetail } from '@/types/user/logs'
import { parseJwtToken } from '@/utils/backend/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export type ApiProxyBackendUserLogDetailResponse = ApiProxyBackendResp<RequestDetail>

export type UserLogDetailResponse = ApiResp<RequestDetail>

export interface UserLogDetailParams {
  log_id: string
}

async function fetchLogs(log_id: string, group: string): Promise<RequestDetail | null> {
  try {
    const url = new URL(
      `/api/log/${group}/detail/${log_id}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

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

    const result: ApiProxyBackendUserLogDetailResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Get logs detail API request failed')
    }

    return result.data || null
  } catch (error) {
    console.error('Get logs detail error:', error)
    throw error
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { log_id: string } }
): Promise<NextResponse<UserLogDetailResponse>> {
  try {
    const group = await parseJwtToken(request.headers)

    if (!params.log_id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Log_id is required',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    const detail = await fetchLogs(params.log_id, group)

    return NextResponse.json({
      code: 200,
      data: detail || undefined
    } satisfies UserLogDetailResponse)
  } catch (error) {
    console.error('Get logs detail error:', error)
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
