import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { GroupStatus } from '@/types/admin/group'

export const dynamic = 'force-dynamic'

async function updateGroup(status: GroupStatus, id: string): Promise<void> {
  try {
    const url = new URL(
      `/api/group/${id}/status`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      body: JSON.stringify({ status: status }),
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to update group status')
    }
  } catch (error) {
    console.error('admin groups api: update group status error:## ', error)
    throw error
  }
}

// update group status
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
          message: 'Group id is required',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    const { status }: { status: GroupStatus } = await request.json()
    await updateGroup(status, params.id)

    return NextResponse.json({
      code: 200,
      message: 'Group status updated successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin groups api: update group status error:## ', error)
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
