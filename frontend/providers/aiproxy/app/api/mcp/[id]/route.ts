import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { McpDetail } from '@/types/mcp'
import { kcOrAppTokenAuth, parseJwtToken } from '@/utils/backend/auth'

export const dynamic = 'force-dynamic'

type ApiProxyBackendMcpDetailResponse = ApiProxyBackendResp<McpDetail>

export type GetMcpDetailResponse = ApiResp<McpDetail>

async function fetchMcpDetail(id: string, group: string): Promise<McpDetail | null> {
  try {
    const url = new URL(
      `/api/group/${group}/mcp/${id}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendMcpDetailResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return result.data!
  } catch (error) {
    console.error('Error fetching MCP detail:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<GetMcpDetailResponse>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'MCP ID is required',
          error: 'Bad Request',
        },
        { status: 400 }
      )
    }

    const data = await fetchMcpDetail(params.id, group)

    return NextResponse.json({
      code: 200,
      data: data || undefined,
    } satisfies GetMcpDetailResponse)
  } catch (error) {
    console.error('MCP detail fetch error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// handle params
async function handleParams(
  id: string,
  group: string,
  params: Record<string, string>
): Promise<void> {
  try {
    const url = new URL(
      `/api/mcp/public/${id}/group/${group}/params`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey

    const updateParams = {
      params: params,
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
      cache: 'no-store',
      body: JSON.stringify(updateParams),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to update MCP params')
    }
  } catch (error) {
    console.error('Error updating MCP params:', error)
    throw error
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResp>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'MCP ID is required',
          error: 'Bad Request',
        },
        { status: 400 }
      )
    }

    await handleParams(params.id, group, await request.json())

    return NextResponse.json({
      code: 200,
      message: 'Params updated successfully',
    } satisfies ApiResp)
  } catch (error) {
    console.error('MCP params update error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
