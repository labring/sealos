import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { getNamespaceFromKubeConfigString } from '@/utils/backend/check-kc'

import { tokenNameParamSchema } from './schema'

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

type TokenSearchResponse = {
  tokens: TokenInfo[]
  total: number
}

async function findTokenByName(name: string, group: string): Promise<TokenInfo | null> {
  try {
    const url = new URL(
      `/api/token/${group}/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    url.searchParams.append('name', name)

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
      return null
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp<TokenSearchResponse> = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to search token')
    }

    const foundToken = result.data?.tokens?.find(tokenInfo => tokenInfo.name === name)

    if (!foundToken) {
      return null
    }

    return foundToken
  } catch (error) {
    console.error('Error searching token:', error)
    throw error
  }
}
// delete token—后端
async function deleteTokenInBackend(name: string, group: string): Promise<void> {
  try {
    const tokenInfo = await findTokenByName(name, group)

    if (!tokenInfo) {
      throw new Error('Token not found')
    }

    // delete  by id
    const url = new URL(
      `/api/token/${group}/${tokenInfo.id}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
      cache: 'no-store',
    })

    if (response.status === 404) {
      throw new Error('Token not found')
    }

    if (response.status === 204) {
      return
    }

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(
        responseText || `HTTP error! status: ${response.status}`
      )
    }

    if (!responseText) {
      return
    }

    const result: ApiProxyBackendResp = JSON.parse(responseText)
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete token')
    }
  } catch (error) {
    console.error('Error deleting token:', error)
    throw error
  }
}

// delete aiproxy token-前端
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
): Promise<NextResponse> {
  try {
    // get namespace from kubeconfig
    const group = await authSession(request.headers)

    // validate path parameter
    const validationResult = tokenNameParamSchema.safeParse(params)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: validationResult.error.errors[0]?.message || 'Invalid token name',
        },
        { status: 400 }
      )
    }

    const { name } = validationResult.data

    // delete aiproxy token
    try {
      await deleteTokenInBackend(name, group)
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Token deletion error:', error)

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

