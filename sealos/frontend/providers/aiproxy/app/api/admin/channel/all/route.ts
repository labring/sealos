import { NextRequest, NextResponse } from 'next/server'
import { ChannelInfo } from '@/types/admin/channels/channelInfo'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'

export const dynamic = 'force-dynamic'

type ApiProxyBackendAllChannelResponse = ApiProxyBackendResp<ChannelInfo[]>

export type GetAllChannelResponse = ApiResp<ChannelInfo[]>

async function fetchChannels(): Promise<ChannelInfo[]> {
  try {
    const url = new URL(
      `/api/channels/all`,
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
    const result: ApiProxyBackendAllChannelResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'admin channels api:ai proxy backend error')
    }
    return result?.data || []
  } catch (error) {
    console.error('admin channels api: fetch all channels from ai proxy backend error:', error)
    throw error
  }
}

// get all channels
export async function GET(request: NextRequest): Promise<NextResponse<GetAllChannelResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    const channels = await fetchChannels()
    return NextResponse.json({
      code: 200,
      data: channels
    } satisfies GetAllChannelResponse)
  } catch (error) {
    console.error('admin channels api: get all channels error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      } satisfies GetAllChannelResponse,
      { status: 500 }
    )
  }
}
