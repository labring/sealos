import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/auth'

export const dynamic = 'force-dynamic'
interface DeleteTokenResponse {
  message: string
  success: boolean
}

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

    const result: DeleteTokenResponse = await response.json()
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
): Promise<NextResponse> {
  try {
    // 验证用户权限
    const userGroup = await parseJwtToken(request.headers)

    // 验证 ID 参数
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

    // 删除 Token
    await deleteToken(userGroup, params.id)

    return NextResponse.json({
      code: 200,
      message: 'Token deleted successfully'
    })
  } catch (error) {
    console.error('Token deletion error:', error)
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
