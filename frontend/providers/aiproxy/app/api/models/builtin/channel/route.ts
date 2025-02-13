import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { ChannelWithMode } from '@/types/models/model'

export const dynamic = 'force-dynamic'

type ApiProxyBackendAllChannelEnabledModeResponse = ApiProxyBackendResp<ChannelWithMode>
export type GetAllChannelEnabledModelsResponse = ApiResp<ChannelWithMode>

async function fetchAllChannelEnabledModels(): Promise<ChannelWithMode> {
  try {
    const url = new URL(
      '/api/models/builtin/channel',
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
    const result: ApiProxyBackendAllChannelEnabledModeResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'builtin channel api: ai proxy backend error')
    }

    return result.data || {}
  } catch (error) {
    console.error('builtin channel api: fetch enabled models error:', error)
    throw error
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GetAllChannelEnabledModelsResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    return NextResponse.json({
      code: 200,
      data: await fetchAllChannelEnabledModels()
    } satisfies GetAllChannelEnabledModelsResponse)
  } catch (error) {
    console.error('builtin channel api: get enabled models error:', error)
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
