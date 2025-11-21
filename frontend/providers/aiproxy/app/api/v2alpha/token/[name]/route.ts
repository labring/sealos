import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'
import { kcOrAppTokenAuthDecoded } from '@/utils/backend/auth'

import { tokenNameParamSchema } from './schema'

export const dynamic = 'force-dynamic'

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
    // get namespace from kubeconfig or workspaceId from JWT token
    const group = await kcOrAppTokenAuthDecoded(request.headers)

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

    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.startsWith('Auth:')) {
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: errorMessage || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

