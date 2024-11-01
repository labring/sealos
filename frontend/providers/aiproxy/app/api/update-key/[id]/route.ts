import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/auth'

export const dynamic = 'force-dynamic'
interface UpdateTokenResponse {
  message: string
  success: boolean
}

interface UpdateTokenBody {
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

    const result: UpdateTokenResponse = await response.json()
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

    // 获取请求体
    const body: UpdateTokenBody = await request.json()

    // 验证状态参数
    if (typeof body.status !== 'number') {
      return NextResponse.json(
        {
          code: 400,
          message: 'Status must be a number',
          error: 'Bad Request'
        },
        { status: 400 }
      )
    }

    // 更新 Token
    await updateToken(userGroup, params.id, body.status)

    return NextResponse.json({
      code: 200,
      message: 'Token updated successfully'
    })
  } catch (error) {
    console.error('Token update error:', error)
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
