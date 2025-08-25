import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'

export const dynamic = 'force-dynamic'

async function updateGroupQpm(qpm: number, id: string): Promise<void> {
  try {
    const url = new URL(
      `/api/group/${id}/qpm`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      body: JSON.stringify({ qpm: qpm }),
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to update group qpm')
    }
  } catch (error) {
    console.error('admin groups api: update group qpm error:## ', error)
    throw error
  }
}

// update group qpm
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

    const { qpm }: { qpm: number } = await request.json()
    await updateGroupQpm(qpm, params.id)

    return NextResponse.json({
      code: 200,
      message: 'Group qpm updated successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin groups api: update group qpm error:## ', error)
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
