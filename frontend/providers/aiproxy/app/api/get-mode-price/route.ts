import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/auth'
import { ModelPrice } from '@/types/backend'

export const dynamic = 'force-dynamic'

interface PriceResponse {
  data: Record<
    string,
    {
      prompt: number
      completion: number
    }
  >
  message: string
  success: boolean
}

function transformToList(
  data: Record<string, { prompt: number; completion: number }>
): ModelPrice[] {
  return Object.entries(data).map(([name, prices]) => ({
    name,
    prompt: prices.prompt,
    completion: prices.completion
  }))
}

async function fetchModelPrices(): Promise<ModelPrice[]> {
  try {
    const url = new URL(
      `/api/models/enabled/price`,
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

    const result: PriceResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'get model prices API request failed')
    }

    return transformToList(result.data)
  } catch (error) {
    console.error('Error fetching model prices:', error)
    return Promise.reject(error)
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await parseJwtToken(request.headers)
    const modelPrices = await fetchModelPrices()

    return NextResponse.json({
      code: 200,
      data: modelPrices
    })
  } catch (error) {
    console.error('get model prices error:', error)
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
