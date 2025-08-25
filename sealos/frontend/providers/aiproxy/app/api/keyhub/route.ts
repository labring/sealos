import { NextRequest, NextResponse } from 'next/server'
import { TokenInfo } from '@/types/user/token'

import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { getNamespaceFromKubeConfigString, verifyK8sConfigString } from '@/utils/backend/check-kc'

export const dynamic = 'force-dynamic'

// create token

interface CreateTokenRequest {
  name: string
  kc: string
}

function validateCreateParams(body: CreateTokenRequest): string | null {
  if (!body.name) {
    return 'Name parameter is required'
  }
  if (!body.kc) {
    return 'Kc parameter is required'
  }
  return null
}

async function createToken(name: string, group: string): Promise<TokenInfo | undefined> {
  try {
    const url = new URL(
      `/api/token/${group}?auto_create_group=true&ignore_exist=true`,
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

    const result: ApiProxyBackendResp<TokenInfo> = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to create token')
    }

    return result?.data
  } catch (error) {
    console.error('Error creating token:', error)
    throw error
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResp<TokenInfo>>> {
  try {
    const body: CreateTokenRequest = await request.json()

    const validationError = validateCreateParams(body)
    if (validationError) {
      return NextResponse.json(
        {
          code: 400,
          message: validationError,
          error: validationError
        } satisfies ApiResp<TokenInfo>,
        { status: 400 }
      )
    }

    const isK8sConfigValid = await verifyK8sConfigString(body.kc)
    if (!isK8sConfigValid) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Invalid K8s config',
          error: 'Invalid K8s config'
        },
        { status: 401 }
      )
    }

    const group = getNamespaceFromKubeConfigString(body.kc)
    // 创建Token
    const newToken = await createToken(body.name, group)

    return NextResponse.json({
      code: 200,
      data: newToken,
      message: 'Token created successfully'
    } satisfies ApiResp<TokenInfo>)
  } catch (error) {
    console.error('Token creation error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      } satisfies ApiResp<TokenInfo>,
      { status: 500 }
    )
  }
}
