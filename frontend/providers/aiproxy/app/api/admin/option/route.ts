import { NextRequest, NextResponse } from 'next/server'
import { OptionData } from '@/types/admin/option'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'

export const dynamic = 'force-dynamic'

type ApiProxyBackendOptionResponse = ApiProxyBackendResp<OptionData>

export type GetOptionResponse = ApiResp<OptionData>

async function fetchOptions(): Promise<OptionData | undefined> {
  try {
    const url = new URL(
      `/api/option/`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendOptionResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch options')
    }

    return result.data
  } catch (error) {
    console.error('admin options api: fetch options error:', error)
    throw error
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GetOptionResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    const optionData = await fetchOptions()

    return NextResponse.json({
      code: 200,
      data: optionData
    } satisfies GetOptionResponse)
  } catch (error) {
    console.error('admin options api: get options error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      } satisfies GetOptionResponse,
      { status: 500 }
    )
  }
}

async function updateOption(key: string, value: string): Promise<string> {
  try {
    const url = new URL(
      `/api/option`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`
      },
      body: JSON.stringify({ key, value }),
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error, status code: ${response.status}`)
    }

    const result: ApiProxyBackendOptionResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to update option')
    }

    return result.message
  } catch (error) {
    console.error('admin options api: update option error:', error)
    throw error
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<GetOptionResponse>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    const body = await request.json()
    if (!body.key || typeof body.key !== 'string') {
      return NextResponse.json(
        {
          code: 400,
          message: 'Invalid request body: key is required and must be a string',
          error: 'Invalid request parameters'
        } satisfies GetOptionResponse,
        { status: 400 }
      )
    }

    if (!body.value || typeof body.value !== 'string') {
      return NextResponse.json(
        {
          code: 400,
          message: 'Invalid request body: value is required and must be a string',
          error: 'Invalid request parameters'
        } satisfies GetOptionResponse,
        { status: 400 }
      )
    }

    await updateOption(body.key, body.value)

    return NextResponse.json({
      code: 200,
      message: 'Option updated successfully'
    } satisfies GetOptionResponse)
  } catch (error) {
    console.error('admin options api: put option error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'server error',
        error: error instanceof Error ? error.message : 'server error'
      } satisfies GetOptionResponse,
      { status: 500 }
    )
  }
}
