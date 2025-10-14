import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { LogItem } from '@/types/user/logs'
import { kcOrAppTokenAuth, parseJwtToken } from '@/utils/backend/auth'

export const dynamic = 'force-dynamic'
export type ApiProxyBackendUserLogSearchResponse = ApiProxyBackendResp<{
  logs: LogItem[]
  total: number
  models: string[]
  token_names: string[]
}>

export type UserLogSearchResponse = ApiResp<{
  logs: LogItem[]
  total: number
  models: string[]
  token_names: string[]
}>

export interface UserLogQueryParams {
  token_name?: string
  model_name?: string
  keyword?: string
  start_timestamp?: string
  end_timestamp?: string
  code_type?: 'all' | 'success' | 'error' | undefined
  page: number
  perPage: number
}

function validateParams(params: UserLogQueryParams): string | null {
  if (params.page < 1) {
    return 'Page number must be greater than 0'
  }
  if (params.perPage < 1 || params.perPage > 100) {
    return 'Per page must be between 1 and 100'
  }
  if (params.start_timestamp && params.end_timestamp) {
    if (parseInt(params.start_timestamp) > parseInt(params.end_timestamp)) {
      return 'Start timestamp cannot be greater than end timestamp'
    }
  }
  return null
}

async function fetchLogs(
  params: UserLogQueryParams,
  group: string
): Promise<{ logs: LogItem[]; total: number; models: string[]; token_names: string[] }> {
  try {
    const url = new URL(
      `/api/log/${group}/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    url.searchParams.append('p', params.page.toString())
    url.searchParams.append('per_page', params.perPage.toString())

    if (params.token_name) {
      url.searchParams.append('token_name', params.token_name)
    }
    if (params.model_name) {
      url.searchParams.append('model_name', params.model_name)
    }

    if (params.keyword) {
      url.searchParams.append('keyword', params.keyword)
    }

    if (params.code_type) {
      url.searchParams.append('code_type', params.code_type)
    }
    if (params.start_timestamp) {
      url.searchParams.append('start_timestamp', params.start_timestamp)
    }
    if (params.end_timestamp) {
      url.searchParams.append('end_timestamp', params.end_timestamp)
    }

    url.searchParams.append('result_only', 'true')

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

    const result: ApiProxyBackendUserLogSearchResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }

    return {
      logs: result.data?.logs || [],
      total: result.data?.total || 0,
      models: result.data?.models || [],
      token_names: result.data?.token_names || [],
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
    throw error
  }
}

/**
 * @swagger
 * /api/user/log:
 *   get:
 *     tags:
 *       - Logs
 *     summary: 查询 API 调用日志列表
 *     description: |
 *       获取 API 调用的历史日志记录，支持多维度的条件筛选和分页查询。
 *
 *       ### 权限要求
 *       - 需要有效的认证信息（Bearer Token 或 KC Token）
 *       - 只能查询当前用户组的日志记录
 *
 *       ### 功能特性
 *       - 支持按 Token 名称筛选
 *       - 支持按模型名称筛选
 *       - 支持关键字搜索
 *       - 支持按时间范围筛选
 *       - 支持按状态码类型筛选（全部/成功/失败）
 *       - 支持分页查询
 *       - 返回可用的模型和 Token 名称列表（用于前端筛选器）
 *
 *       ### 使用示例
 *       - 查询第一页：`?page=1&perPage=10`
 *       - 筛选特定模型：`?page=1&perPage=10&model_name=gpt-4`
 *       - 查询失败请求：`?page=1&perPage=10&code_type=error`
 *       - 时间范围查询：`?page=1&perPage=10&start_timestamp=1697001600&end_timestamp=1697088000`
 *     operationId: getUserLogs
 *     security:
 *       - BearerAuth: []
 *       - KCAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: true
 *         description: 页码，从 1 开始
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *       - name: perPage
 *         in: query
 *         required: true
 *         description: 每页记录数，范围 1-100
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         example: 10
 *       - name: token_name
 *         in: query
 *         required: false
 *         description: 按 Token 名称筛选
 *         schema:
 *           type: string
 *         example: "my-api-token"
 *       - name: model_name
 *         in: query
 *         required: false
 *         description: 按模型名称筛选
 *         schema:
 *           type: string
 *         example: "gpt-4"
 *       - name: keyword
 *         in: query
 *         required: false
 *         description: 关键字搜索（搜索请求内容、响应内容等）
 *         schema:
 *           type: string
 *         example: "error message"
 *       - name: code_type
 *         in: query
 *         required: false
 *         description: 按状态码类型筛选
 *         schema:
 *           type: string
 *           enum: [all, success, error]
 *         example: "success"
 *       - name: start_timestamp
 *         in: query
 *         required: false
 *         description: 开始时间戳（Unix 时间戳，秒级）
 *         schema:
 *           type: string
 *         example: "1697001600"
 *       - name: end_timestamp
 *         in: query
 *         required: false
 *         description: 结束时间戳（Unix 时间戳，秒级）
 *         schema:
 *           type: string
 *         example: "1697088000"
 *     responses:
 *       200:
 *         description: 成功获取日志列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   description: HTTP 状态码
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       description: 日志记录列表
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: 日志记录 ID
 *                             example: 12345
 *                           request_id:
 *                             type: string
 *                             description: 请求唯一标识符
 *                             example: "req_abc123def456"
 *                           request_at:
 *                             type: integer
 *                             description: 请求时间戳（Unix 时间戳，秒级）
 *                             example: 1697001600
 *                           created_at:
 *                             type: integer
 *                             description: 创建时间戳（Unix 时间戳，秒级）
 *                             example: 1697001600
 *                           code:
 *                             type: integer
 *                             description: HTTP 状态码
 *                             example: 200
 *                           content:
 *                             type: string
 *                             description: 内容摘要或错误信息
 *                             example: "Request completed successfully"
 *                           group:
 *                             type: string
 *                             description: 所属用户组
 *                             example: "ns-admin"
 *                           model:
 *                             type: string
 *                             description: 使用的模型名称
 *                             example: "gpt-4"
 *                           mode:
 *                             type: integer
 *                             description: 请求模式
 *                             example: 1
 *                           used_amount:
 *                             type: number
 *                             description: 消费金额
 *                             example: 0.05
 *                           price:
 *                             type: object
 *                             description: 价格详情
 *                             properties:
 *                               input_price:
 *                                 type: number
 *                                 description: 输入价格
 *                                 example: 0.03
 *                               output_price:
 *                                 type: number
 *                                 description: 输出价格
 *                                 example: 0.06
 *                               image_input_price:
 *                                 type: number
 *                                 description: 图片输入价格
 *                                 example: 0.0
 *                               thinking_mode_output_price:
 *                                 type: number
 *                                 description: 思考模式输出价格
 *                                 example: 0.0
 *                               per_request_price:
 *                                 type: number
 *                                 description: 每次请求价格
 *                                 example: 0.0
 *                           token_id:
 *                             type: integer
 *                             description: Token ID
 *                             example: 100
 *                           token_name:
 *                             type: string
 *                             description: 使用的 Token 名称
 *                             example: "my-api-token"
 *                           usage:
 *                             type: object
 *                             description: Token 使用情况
 *                             properties:
 *                               input_tokens:
 *                                 type: integer
 *                                 description: 输入 Token 数量
 *                                 example: 150
 *                               output_tokens:
 *                                 type: integer
 *                                 description: 输出 Token 数量
 *                                 example: 50
 *                               total_tokens:
 *                                 type: integer
 *                                 description: 总 Token 数量
 *                                 example: 200
 *                           channel:
 *                             type: integer
 *                             description: 渠道 ID
 *                             example: 1
 *                           endpoint:
 *                             type: string
 *                             description: API 端点
 *                             example: "/v1/chat/completions"
 *                           request_detail:
 *                             type: object
 *                             nullable: true
 *                             description: 请求详情（可选）
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 description: 详情 ID
 *                                 example: 1
 *                               log_id:
 *                                 type: integer
 *                                 description: 关联的日志 ID
 *                                 example: 12345
 *                               request_body:
 *                                 type: string
 *                                 description: 请求体内容
 *                                 example: '{"messages":[{"role":"user","content":"Hello"}]}'
 *                               response_body:
 *                                 type: string
 *                                 description: 响应体内容
 *                                 example: '{"choices":[{"message":{"content":"Hi"}}]}'
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 256
 *                     models:
 *                       type: array
 *                       description: 可用的模型名称列表
 *                       items:
 *                         type: string
 *                       example: ["gpt-4", "gpt-3.5-turbo"]
 *                     token_names:
 *                       type: array
 *                       description: 可用的 Token 名称列表
 *                       items:
 *                         type: string
 *                       example: ["my-api-token", "test-token"]
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   code: 200
 *                   data:
 *                     logs:
 *                       - id: 12345
 *                         request_id: "req_abc123def456"
 *                         request_at: 1697001600
 *                         created_at: 1697001600
 *                         code: 200
 *                         content: "Request completed successfully"
 *                         group: "ns-admin"
 *                         model: "gpt-4"
 *                         mode: 1
 *                         used_amount: 0.05
 *                         price:
 *                           input_price: 0.03
 *                           output_price: 0.06
 *                           image_input_price: 0.0
 *                           thinking_mode_output_price: 0.0
 *                           per_request_price: 0.0
 *                         token_id: 100
 *                         token_name: "my-api-token"
 *                         usage:
 *                           input_tokens: 150
 *                           output_tokens: 50
 *                           total_tokens: 200
 *                         channel: 1
 *                         endpoint: "/v1/chat/completions"
 *                       - id: 12346
 *                         request_id: "req_def456ghi789"
 *                         request_at: 1697001500
 *                         created_at: 1697001500
 *                         code: 200
 *                         content: "Request completed successfully"
 *                         group: "ns-admin"
 *                         model: "gpt-3.5-turbo"
 *                         mode: 1
 *                         used_amount: 0.02
 *                         price:
 *                           input_price: 0.001
 *                           output_price: 0.002
 *                           image_input_price: 0.0
 *                           thinking_mode_output_price: 0.0
 *                           per_request_price: 0.0
 *                         token_id: 101
 *                         token_name: "test-token"
 *                         usage:
 *                           input_tokens: 100
 *                           output_tokens: 30
 *                           total_tokens: 130
 *                         channel: 1
 *                         endpoint: "/v1/chat/completions"
 *                     total: 256
 *                     models: ["gpt-4", "gpt-3.5-turbo"]
 *                     token_names: ["my-api-token", "test-token"]
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               invalid_page:
 *                 summary: 页码参数错误
 *                 value:
 *                   code: 400
 *                   message: "Page number must be greater than 0"
 *                   error: "Page number must be greater than 0"
 *               invalid_perPage:
 *                 summary: 每页数量参数错误
 *                 value:
 *                   code: 400
 *                   message: "Per page must be between 1 and 100"
 *                   error: "Per page must be between 1 and 100"
 *               invalid_timestamp:
 *                 summary: 时间戳范围错误
 *                 value:
 *                   code: 400
 *                   message: "Start timestamp cannot be greater than end timestamp"
 *                   error: "Start timestamp cannot be greater than end timestamp"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(request: NextRequest): Promise<NextResponse<UserLogSearchResponse>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)
    const searchParams = request.nextUrl.searchParams

    const queryParams: UserLogQueryParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: parseInt(searchParams.get('perPage') || '10', 10),
      token_name: searchParams.get('token_name') || undefined,
      model_name: searchParams.get('model_name') || undefined,
      code_type: (searchParams.get('code_type') as 'all' | 'success' | 'error') || undefined,
      start_timestamp: searchParams.get('start_timestamp') || undefined,
      end_timestamp: searchParams.get('end_timestamp') || undefined,
      keyword: searchParams.get('keyword') || undefined,
    }

    const validationError = validateParams(queryParams)
    if (validationError) {
      return NextResponse.json(
        {
          code: 400,
          message: validationError,
          error: validationError,
        },
        { status: 400 }
      )
    }

    const { logs, total, models, token_names } = await fetchLogs(queryParams, group)

    return NextResponse.json({
      code: 200,
      data: {
        logs,
        total,
        models,
        token_names,
      },
    } satisfies UserLogSearchResponse)
  } catch (error) {
    console.error('Logs search error:', error)
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
