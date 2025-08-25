import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { ModelConfig } from '@/types/models/model'

type ApiProxyBackendEnabledModelsResponse = ApiProxyBackendResp<ModelConfig[]>
export type GetEnabledModelsResponse = ApiResp<ModelConfig[]>

export const dynamic = 'force-dynamic'

async function fetchEnabledModels(namespace: string): Promise<ModelConfig[]> {
  try {
    const url = new URL(
      `/api/dashboard/${namespace}/models`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${global.AppConfig?.auth.aiProxyBackendKey}`
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendEnabledModelsResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'enabled models api: ai proxy backend error')
    }

    return result.data || []
  } catch (error) {
    console.error('enabled models api: fetch enabled models error:', error)
    throw error
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GetEnabledModelsResponse>> {
  try {
    const group = await parseJwtToken(request.headers)

    return NextResponse.json({
      code: 200,
      data: await fetchEnabledModels(group)
    } satisfies GetEnabledModelsResponse)
  } catch (error) {
    console.error('enabled models api: get enabled models error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      },
      { status: 500 }
    )
  }
}
