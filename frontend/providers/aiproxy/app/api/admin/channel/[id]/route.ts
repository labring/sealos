import { NextRequest, NextResponse } from 'next/server'
import { ChannelInfo } from '@/types/admin/channels/channelInfo'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { CreateChannelRequest } from '@/types/admin/channels/channelInfo'

export const dynamic = 'force-dynamic'

export type GetChannelsResponse = ApiResp<{
  channels: ChannelInfo[]
  total: number
}>

async function updateChannel(channelData: CreateChannelRequest, id: string): Promise<void> {
  try {
    const url = new URL(
      `/api/channel/${id}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'PUT',
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
    console.error('admin channels api: create channel error:## ', error)
    throw error
  }
}

// update channel
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResp>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Channel id is required',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    const channelData: CreateChannelRequest = await request.json()
    await updateChannel(channelData, params.id)

    return NextResponse.json({
      code: 200,
      message: 'Channel created successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin channels api: create channel error:## ', error)
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

async function deleteChannel(id: string): Promise<void> {
  try {
    const url = new URL(
      `/api/channel/${id}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }
    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'admin channels api:ai proxy backend error')
    }
  } catch (error) {
    console.error('admin channels api: delete channel error:', error)
    throw error
  }
}

// delete channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResp>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Channel id is required',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    await deleteChannel(params.id)
    return NextResponse.json({
      code: 200,
      message: 'Channel deleted successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin channels api: delete channel error:', error)
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
