import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { BatchOptionData } from '@/types/admin/option'

export const dynamic = 'force-dynamic'

async function batchOption(batchOptionData: BatchOptionData): Promise<string> {
  try {
    const url = new URL(
      `/api/option/batch`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      body: JSON.stringify(batchOptionData),
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to batch option')
    }

    return result.message
  } catch (error) {
    console.error('admin batch options api: update option error:', error)
    throw error
  }
}

function validateBatchOptionData(batchOptionData: BatchOptionData): boolean {
  if (typeof batchOptionData.DefaultChannelModelMapping !== 'string') {
    return false
  }
  if (typeof batchOptionData.DefaultChannelModels !== 'string') {
    return false
  }
  return true
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResp>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    const body = await request.json()
    if (!validateBatchOptionData(body)) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Invalid request body',
          error: 'Invalid request body'
        } satisfies ApiResp,
        { status: 400 }
      )
    }

    await batchOption(body)

    return NextResponse.json({
      code: 200,
      message: 'Option batch updated successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin batch options api: put option error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      } satisfies ApiResp,
      { status: 500 }
    )
  }
}
