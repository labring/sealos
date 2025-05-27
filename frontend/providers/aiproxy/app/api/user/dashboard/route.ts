import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { DashboardData } from '@/types/user/dashboard'
import { DashboardResponse } from '@/types/user/dashboard'

// 定义API响应数据结构
export type ApiProxyBackendDashboardResponse = ApiProxyBackendResp<DashboardData>

// 定义查询参数接口
export interface DashboardQueryParams {
  type: 'day' | 'week' | 'two_week' | 'month'
  model?: string
  token_name?: string
  start_timestamp?: string
  end_timestamp?: string
  timezone?: string
  timespan?: 'day' | 'hour'
}

// 获取仪表盘数据
async function fetchDashboardData(
  params: DashboardQueryParams,
  group: string
): Promise<DashboardData> {
  try {
    const url = new URL(
      `/api/dashboard/${group}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    if (params.type) {
      url.searchParams.append('type', params.type)
    }

    if (params.start_timestamp) {
      url.searchParams.append('start_timestamp', params.start_timestamp)
    }

    if (params.end_timestamp) {
      url.searchParams.append('end_timestamp', params.end_timestamp)
    }

    if (params.timezone) {
      url.searchParams.append('timezone', params.timezone)
    }

    if (params.timespan) {
      url.searchParams.append('timespan', params.timespan)
    }

    if (params.model) {
      url.searchParams.append('model', params.model)
    }

    if (params.token_name) {
      url.searchParams.append('token_name', params.token_name)
    }

    url.searchParams.append('result_only', 'true')

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

    const result: ApiProxyBackendDashboardResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return result.data!
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<DashboardResponse>> {
  try {
    const group = await parseJwtToken(request.headers)
    const searchParams = request.nextUrl.searchParams

    const queryParams: DashboardQueryParams = {
      type: (searchParams.get('type') as 'day' | 'week' | 'two_week' | 'month') || undefined,
      model: searchParams.get('model') || undefined,
      start_timestamp: searchParams.get('start_timestamp') || undefined,
      end_timestamp: searchParams.get('end_timestamp') || undefined,
      timezone: searchParams.get('timezone') || undefined,
      timespan: (searchParams.get('timespan') as 'day' | 'hour') || undefined,
      token_name: searchParams.get('token_name') || undefined
    }

    const dashboardData = await fetchDashboardData(queryParams, group)

    return NextResponse.json({
      code: 200,
      data: dashboardData
    } satisfies DashboardResponse)
  } catch (error) {
    console.error('Dashboard fetch error:', error)
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
