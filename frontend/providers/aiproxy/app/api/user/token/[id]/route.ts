import { NextRequest, NextResponse } from 'next/server'
import { checkSealosUserIsRealName, parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'

export const dynamic = 'force-dynamic'

async function deleteToken(group: string, id: string): Promise<void> {
  try {
    const url = new URL(
      `/api/token/${group}/${id}`,
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
      throw new Error(result.message || 'Failed to delete token')
    }
  } catch (error) {
    console.error('Error deleting token:', error)
    throw error
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResp>> {
  try {
    const userGroup = await parseJwtToken(request.headers)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Token ID is required',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    await deleteToken(userGroup, params.id)

    return NextResponse.json({
      code: 200,
      message: 'Token deleted successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('Token deletion error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      } satisfies ApiResp,
      { status: 500 }
    )
  }
}

// update token status
interface UpdateTokenRequestBody {
  status: number
}

async function updateToken(group: string, id: string, status: number): Promise<void> {
  try {
    if (status !== 1 && status !== 2) {
      throw new Error('Invalid status')
    }
    const url = new URL(
      `/api/token/${group}/${id}/status`,
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to update token')
    }
  } catch (error) {
    console.error('Error updating token:', error)
    throw error
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResp>> {
  try {
    const userGroup = await parseJwtToken(request.headers)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Token ID is required',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    const isRealName = await checkSealosUserIsRealName(request.headers)

    if (!isRealName) {
      return NextResponse.json(
        {
          code: 400,
          message: 'key.userNotRealName',
          error: 'key.userNotRealName'
        },
        { status: 400 }
      )
    }

    const updateTokenBody: UpdateTokenRequestBody = await request.json()

    if (typeof updateTokenBody.status !== 'number') {
      return NextResponse.json(
        {
          code: 400,
          message: 'Status must be a number',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    await updateToken(userGroup, params.id, updateTokenBody.status)

    return NextResponse.json({
      code: 200,
      message: 'Token updated successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('Token update error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      } satisfies ApiResp,
      { status: 500 }
    )
  }
}
