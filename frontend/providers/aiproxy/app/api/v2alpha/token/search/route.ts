import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { getNamespaceFromKubeConfigString } from '@/utils/backend/check-kc'

import { tokenSearchQuerySchema } from './schema'

type TokenSearchResponse = {
  tokens: TokenInfo[]
  total: number
}
export const dynamic = 'force-dynamic'

async function authSession(headers: Headers): Promise<string> {
  if (!headers) {
    throw new Error('Auth: Headers are missing')
  }

  const authorization = headers.get('Authorization')

  if (!authorization) {
    throw new Error('Auth: Authorization header is missing')
  }

  try {
    // decode kubeconfig
    const kubeConfig = decodeURIComponent(authorization)
    const namespace = getNamespaceFromKubeConfigString(kubeConfig)
    return namespace
  } catch (err) {
    console.error('Auth: Failed to parse kubeconfig:', err)
    throw new Error('Auth: Invalid kubeconfig')
  }
}

// search aiproxy tokens-后端
async function searchTokensInBackend(
  group: string,
  name?: string
): Promise<TokenSearchResponse> {
  try {
    const url = new URL(
      `/api/token/${group}/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    if (name) {
      url.searchParams.append('name', name)
    } else {
      url.searchParams.append('p', '1')
      url.searchParams.append('per_page', '10')
    }
    // get aiproxy backend token
    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
      cache: 'no-store',
    })

    if (response.status === 404) {
      if (name) {
        throw new Error('Token not found')
      }
      return { tokens: [], total: 0 }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp<{ tokens: TokenInfo[]; total: number }> =
      await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to search tokens')
    }

    return {
      tokens: result?.data?.tokens || [],
      total: result?.data?.total || 0,
    }
  } catch (error) {
    console.error('Error searching tokens:', error)
    throw error
  }
}


// search aiproxy tokens-前端
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const group = await authSession(request.headers)
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      name: searchParams.get('name') || undefined,
    }
// validate query params
    const validationResult = tokenSearchQuerySchema.safeParse(queryParams)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: validationResult.error.errors[0]?.message || 'Invalid query parameters',
        },
        { status: 400 }
      )
    }

    const { name } = validationResult.data

    // search aiproxy tokens
    try {
      const result = await searchTokensInBackend(group, name)

      return NextResponse.json(result.tokens, { status: 200 })
    } catch (error) {
      if (error instanceof Error && error.message === 'Token not found') {
        return NextResponse.json(
          {
            error: 'The specified token does not exist',
          },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Token search error:', error)

    if (error instanceof Error && error.message.startsWith('Auth:')) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

