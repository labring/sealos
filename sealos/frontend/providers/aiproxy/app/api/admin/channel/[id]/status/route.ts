import { NextRequest, NextResponse } from 'next/server'
import { ChannelInfo } from '@/types/admin/channels/channelInfo'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { CreateChannelRequest } from '@/types/admin/channels/channelInfo'

export const dynamic = 'force-dynamic'

// update channel status

async function updateChannelStatus(id: string, status: number): Promise<void> {
  try {
    const url = new URL(
      `/api/channel/${id}/status`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      body: JSON.stringify({ status }),
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to update channel status')
    }
  } catch (error) {
    console.error('admin channels api: update channel status error:## ', error)
    throw error
  }
}

export async function POST(
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

    const { status }: { status: number } = await request.json()
    await updateChannelStatus(params.id, status)

    return NextResponse.json({
      code: 200,
      message: 'Channel status updated successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin channels api: update channel status error:## ', error)
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
