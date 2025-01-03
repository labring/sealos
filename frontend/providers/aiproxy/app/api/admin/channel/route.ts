import { NextRequest, NextResponse } from 'next/server'
import { ChannelInfo } from '@/types/admin/channels/channelInfo'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { CreateChannelRequest } from '@/types/admin/channels/channelInfo'

export const dynamic = 'force-dynamic'

type ApiProxyBackendChannelsSearchResponse = ApiProxyBackendResp<{
  channels: ChannelInfo[]
  total: number
}>

export type ChannelQueryParams = {
  page: number
  perPage: number
}

export type GetChannelsResponse = ApiResp<{
  channels: ChannelInfo[]
  total: number
}>

function validateParams(queryParams: ChannelQueryParams): string | null {
  if (queryParams.page < 1) {
    return 'Page number must be greater than 0'
  }
  if (queryParams.perPage < 1 || queryParams.perPage > 100) {
    return 'Per page must be between 1 and 100'
  }
  return null
}

async function fetchChannels(
  queryParams: ChannelQueryParams
): Promise<{ channels: ChannelInfo[]; total: number }> {
  try {
    const url = new URL(
      `/api/channels/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    url.searchParams.append('p', queryParams.page.toString())
    url.searchParams.append('per_page', queryParams.perPage.toString())
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
    const result: ApiProxyBackendChannelsSearchResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'admin channels api:ai proxy backend error')
    }
    return {
      channels: result?.data?.channels || [],
      total: result?.data?.total || 0
    }
  } catch (error) {
    console.error('admin channels api: fetch channels from ai proxy backend error:', error)
    throw error
  }
}

async function createChannel(channelData: CreateChannelRequest): Promise<void> {
  try {
    const url = new URL(
      `/api/channel/`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      body: JSON.stringify(channelData),
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to create channel')
    }
  } catch (error) {
    console.error('admin channels api: create channel error:', error)
    throw error
  }
}

// get channels
export async function GET(request: NextRequest): Promise<NextResponse<GetChannelsResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)
    const searchParams = request.nextUrl.searchParams

    const queryParams: ChannelQueryParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: parseInt(searchParams.get('perPage') || '10', 10)
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

    const { channels, total } = await fetchChannels(queryParams)
    return NextResponse.json({
      code: 200,
      data: {
        channels: channels,
        total: total
      }
    } satisfies GetChannelsResponse)
  } catch (error) {
    console.error('admin channels api: get channels error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      } satisfies GetChannelsResponse,
      { status: 500 }
    )
  }
}

// create channel
export async function POST(request: NextRequest): Promise<NextResponse<ApiResp>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    const channelData: CreateChannelRequest = await request.json()
    await createChannel(channelData)

    return NextResponse.json({
      code: 200,
      message: 'Channel created successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin channels api: create channel error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      } satisfies ApiResp,
      { status: 500 }
    )
  }
}
