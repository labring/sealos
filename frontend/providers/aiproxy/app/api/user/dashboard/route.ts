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
}

// 验证查询参数
function validateParams(params: DashboardQueryParams): string | null {
  if (!params.type) {
    return 'Type parameter is required'
  }
  if (
    params.type !== 'day' &&
    params.type !== 'week' &&
    params.type !== 'two_week' &&
    params.type !== 'month'
  ) {
    return 'Invalid type parameter. Must be one of: day, week, two_week, month'
  }
  return null
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

    url.searchParams.append('type', params.type)
    if (params.model) {
      url.searchParams.append('model', params.model)
    }

    if (params.token_name) {
      url.searchParams.append('token_name', params.token_name)
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

    const result: ApiProxyBackendDashboardResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return {
      chart_data: result.data?.chart_data || [],
      token_names: result.data?.token_names || [],
      models: result.data?.models || [],
      total_count: result.data?.total_count || 0,
      exception_count: result.data?.exception_count || 0,
      used_amount: result.data?.used_amount || 0,
      rpm: result.data?.rpm || 0,
      tpm: result.data?.tpm || 0
    }
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
      type: (searchParams.get('type') as 'day' | 'week' | 'two_week' | 'month') || 'week',
      model: searchParams.get('model') || undefined,
      token_name: searchParams.get('token_name') || undefined
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
