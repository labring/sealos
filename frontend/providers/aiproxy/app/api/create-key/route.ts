import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/auth'

export const dynamic = 'force-dynamic'

interface CreateTokenRequest {
  name: string
}

interface TokenInfo {
  id: number
  group: string
  key: string
  status: number
  name: string
  quota: number
  used_amount: number
  request_count: number
  models: string[] | null
  subnet: string
  created_at: number
  accessed_at: number
  expired_at: number
}

interface CreateTokenResponse {
  data: TokenInfo
  message: string
  success: boolean
}

function validateCreateParams(body: CreateTokenRequest): string | null {
  if (!body.name) {
    return 'Name parameter is required'
  }
  return null
}

async function createToken(name: string, group: string): Promise<TokenInfo> {
  try {
    const url = new URL(
      `/api/token/${group}?auto_create_group=true`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      cache: 'no-store',
      body: JSON.stringify({
        name
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: CreateTokenResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to create token')
    }

    return result.data
  } catch (error) {
    console.error('Error creating token:', error)
    throw error
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const group = await parseJwtToken(request.headers)
    const body: CreateTokenRequest = await request.json()

    const validationError = validateCreateParams(body)
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

    // 创建Token
    const newToken = await createToken(body.name, group)

    return NextResponse.json({
      code: 200,
      data: newToken,
      message: 'Token created successfully'
    })
  } catch (error) {
    console.error('Token creation error:', error)
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
