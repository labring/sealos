import { NextRequest, NextResponse } from 'next/server'
import { ChannelTypeMapName } from '@/types/admin/channels/channelInfo'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'

export const dynamic = 'force-dynamic'

type ApiProxyBackendChannelTypeMapNameResponse = ApiProxyBackendResp<ChannelTypeMapName>

export type GetChannelTypeNamesResponse = ApiResp<ChannelTypeMapName>

async function fetchChannelTypeNames(): Promise<ChannelTypeMapName | undefined> {
  try {
    const url = new URL(
      `/api/channels/type_names`,
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
      throw new Error(`HTTP error, status code: ${response.status}`)
    }
    const result: ApiProxyBackendChannelTypeMapNameResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'admin channels api:ai proxy backend error')
    }
    return result.data
  } catch (error) {
    console.error(
      'admin channels api: fetch channel type names from ai proxy backend error:',
      error
    )
    throw error
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GetChannelTypeNamesResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    const channelTypeNames = await fetchChannelTypeNames()

    return NextResponse.json({
      code: 200,
      data: channelTypeNames
    } satisfies GetChannelTypeNamesResponse)
  } catch (error) {
    console.error('admin channels api: get channel type names error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      } satisfies GetChannelTypeNamesResponse,
      { status: 500 }
    )
  }
}
