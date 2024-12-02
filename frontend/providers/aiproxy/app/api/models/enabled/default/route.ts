import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { ModelMap } from '@/types/models/model'

export const dynamic = 'force-dynamic'

type ApiProxyBackendDefaultEnabledModelsResponse = ApiProxyBackendResp<ModelMap>
export type GetDefaultEnabledModelsResponse = ApiResp<ModelMap>

async function fetchDefaultEnabledModels(): Promise<ModelMap> {
  try {
    const url = new URL(
      '/api/models/enabled/default',
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
    const result: ApiProxyBackendDefaultEnabledModelsResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'default enabled models api: ai proxy backend error')
    }

    return result.data || {}
  } catch (error) {
    console.error('default enabled models api: fetch enabled models error:', error)
    throw error
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GetDefaultEnabledModelsResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    return NextResponse.json({
      code: 200,
      data: await fetchDefaultEnabledModels()
    })
  } catch (error) {
    console.error('default enabled models api: get enabled models error:', error)
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
