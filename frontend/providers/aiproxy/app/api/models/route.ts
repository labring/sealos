import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { isAdmin } from '@/utils/backend/isAdmin'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { ModelMap } from '@/types/models/model'

export const dynamic = 'force-dynamic'

type ModelsResponse = ApiProxyBackendResp<ModelMap>

export type GetModelsResponse = ApiResp<ModelMap>

async function fetchModels(): Promise<ModelMap> {
  try {
    const url = new URL(
      '/api/models',
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

    const result: ModelsResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'models api: ai proxy backend error')
    }

    return result.data || {}
  } catch (error) {
    console.error('models api: fetch models from ai proxy backend error:', error)
    throw error
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GetModelsResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    return NextResponse.json({
      code: 200,
      data: await fetchModels()
    })
  } catch (error) {
    console.error('admin models api: get models error:', error)
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
