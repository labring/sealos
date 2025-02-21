import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { parseJwtToken } from '@/utils/backend/auth'
import { isAdmin } from '@/utils/backend/isAdmin'
import { NextRequest, NextResponse } from 'next/server'

// delete
async function deleteGroup(id: string): Promise<void> {
  try {
    const url = new URL(
      `/api/group/${id}`,
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }
  } catch (error) {
    console.error('Error deleting group:', error)
    throw error
  }
}

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
          message: 'Group id is required',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    await deleteGroup(params.id)

    return NextResponse.json({
      code: 200,
      message: 'Group deleted successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('Groups search error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
