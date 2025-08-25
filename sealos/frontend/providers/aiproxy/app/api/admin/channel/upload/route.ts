import { NextRequest, NextResponse } from 'next/server'
import { parseJwtToken } from '@/utils/backend/auth'
import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { isAdmin } from '@/utils/backend/isAdmin'
import { CreateChannelRequest } from '@/types/admin/channels/channelInfo'

export const dynamic = 'force-dynamic'

// 解析文件内容
async function parseFormData(req: NextRequest): Promise<CreateChannelRequest[]> {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      throw new Error('No file uploaded')
    }

    // 读取文件内容
    const fileContent = await file.text()
    const channelData = JSON.parse(fileContent)

    if (!Array.isArray(channelData)) {
      throw new Error('Invalid file format: expected array of channel data')
    }

    return channelData
  } catch (error) {
    throw error
  }
}

// 创建通道
async function createChannels(channelData: CreateChannelRequest[]): Promise<void> {
  const url = new URL(
    '/api/channels/',
    global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  )
  const token = global.AppConfig?.auth.aiProxyBackendKey

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`
    },
    body: JSON.stringify(channelData),
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error(`HTTP error, status code: ${response.status}`)
  }

  const result: ApiProxyBackendResp = await response.json()
  if (!result.success) {
    throw new Error(result.message || 'Failed to create channels')
  }
}

// 处理上传请求
export async function POST(request: NextRequest): Promise<NextResponse<ApiResp>> {
  try {
    // 验证管理员权限
    const namespace = await parseJwtToken(request.headers)
    await isAdmin(namespace)

    // 解析上传的文件
    const channelData = await parseFormData(request)

    // 创建通道
    await createChannels(channelData)

    return NextResponse.json({
      code: 200,
      message: 'Channels created successfully'
    } satisfies ApiResp)
  } catch (error) {
    console.error('admin channels api: create channels error:', error)
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
