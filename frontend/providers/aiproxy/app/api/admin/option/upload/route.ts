import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { OptionData } from '@/types/admin/option'

export const dynamic = 'force-dynamic'

async function parseFormData(req: NextRequest): Promise<OptionData> {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      throw new Error('No file uploaded')
    }

    const fileContent = await file.text()
    const optionData = JSON.parse(fileContent)

    if (typeof optionData !== 'object' || optionData === null) {
      throw new Error('Invalid file format: expected option data object')
    }

    return optionData
  } catch (error) {
    throw error
  }
}

async function batchOption(batchOptionData: OptionData): Promise<string> {
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
    console.error('admin batch options upload api: update option error:', error)
    throw error
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResp>> {
  try {
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    const optionData = await parseFormData(request)

    await batchOption(optionData)

    return NextResponse.json({
      code: 200,
      message: 'Option batch uploaded successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin batch options upload api: put option error:', error)
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
