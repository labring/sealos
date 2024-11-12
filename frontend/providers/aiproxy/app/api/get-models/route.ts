import { NextRequest, NextResponse } from 'next/server'

import { parseJwtToken } from '@/utils/auth'

export const dynamic = 'force-dynamic'

interface SearchResponse {
  data: string[]
  message: string
  success: boolean
}

async function fetchModels(): Promise<string[]> {
  try {
    const url = new URL(
      `/api/models/enabled`,
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: SearchResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'get models API request failed')
    }

    return result.data.sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.error('Error fetching models:', error)
    return Promise.reject(error)
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await parseJwtToken(request.headers)

    const models = await fetchModels()

    return NextResponse.json({
      code: 200,
      data: models
    })
  } catch (error) {
    console.error('get models error:', error)

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
