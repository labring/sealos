import { NextRequest, NextResponse } from "next/server"

import { ApiProxyBackendResp, ApiResp } from "@/types/api"
import { RequestDetail } from "@/types/user/logs"
import { kcOrAppTokenAuth, parseJwtToken } from "@/utils/backend/auth"

export const dynamic = "force-dynamic"
export type ApiProxyBackendUserLogDetailResponse = ApiProxyBackendResp<RequestDetail>

export type UserLogDetailResponse = ApiResp<RequestDetail>

export interface UserLogDetailParams {
  log_id: string
}

async function fetchLogs(log_id: string, group: string): Promise<RequestDetail | null> {
  try {
    const url = new URL(
      `/api/log/${group}/detail/${log_id}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendUserLogDetailResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || "Get logs detail API request failed")
    }

    return result.data || null
  } catch (error) {
    console.error("Get logs detail error:", error)
    throw error
  }
}

/**
 * @swagger
 * /api/user/log/detail/{log_id}:
 *   get:
 *     tags:
 *       - Logs
 *     summary: 获取单条日志的详细信息
 *     description: |
 *       根据日志 ID 获取 API 调用的完整详细信息，包括请求内容、响应内容、Token 使用情况等。
 *
 *       ### 权限要求
 *       - 需要有效的认证信息（Bearer Token 或 KC Token）
 *       - 只能查询当前用户组的日志记录
 *       - 无法查询其他用户或组的日志详情
 *
 *       ### 功能特性
 *       - 获取完整的请求和响应内容
 *       - 查看详细的 Token 使用统计
 *       - 查看请求时间、耗时等元数据
 *       - 查看模型、状态码等信息
 *
 *       ### 使用场景
 *       - 调试 API 调用问题
 *       - 查看具体请求和响应内容
 *       - 分析 Token 使用情况
 *       - 审计和追溯特定的 API 调用
 *     operationId: getLogDetail
 *     security:
 *       - BearerAuth: []
 *       - KCAuth: []
 *     parameters:
 *       - name: log_id
 *         in: path
 *         required: true
 *         description: 日志记录的唯一标识符 ID
 *         schema:
 *           type: string
 *           minLength: 1
 *         example: "log_abc123def456"
 *     responses:
 *       200:
 *         description: 成功获取日志详情
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
 *                   description: 请求详细信息
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 详情记录 ID
 *                       example: 1
 *                     log_id:
 *                       type: integer
 *                       description: 关联的日志 ID
 *                       example: 12345
 *                     request_body:
 *                       type: string
 *                       nullable: true
 *                       description: 请求体内容（JSON 字符串）
 *                       example: '{"messages":[{"role":"user","content":"What is AI?"}],"model":"gpt-4"}'
 *                     response_body:
 *                       type: string
 *                       nullable: true
 *                       description: 响应体内容（JSON 字符串）
 *                       example: '{"id":"chatcmpl-123","object":"chat.completion","choices":[{"message":{"role":"assistant","content":"AI stands for Artificial Intelligence..."}}]}'
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   code: 200
 *                   data:
 *                     id: 1
 *                     log_id: 12345
 *                     request_body: '{"messages":[{"role":"user","content":"What is AI?"}],"model":"gpt-4","temperature":0.7}'
 *                     response_body: '{"id":"chatcmpl-123","object":"chat.completion","created":1697001600,"model":"gpt-4","choices":[{"index":0,"message":{"role":"assistant","content":"AI stands for Artificial Intelligence, which refers to the simulation of human intelligence in machines..."},"finish_reason":"stop"}],"usage":{"prompt_tokens":150,"completion_tokens":50,"total_tokens":200}}'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               missing_log_id:
 *                 summary: 缺少日志 ID
 *                 value:
 *                   code: 400
 *                   message: "Log_id is required"
 *                   error: "Bad Request"
 *               invalid_log_id:
 *                 summary: 日志 ID 格式错误
 *                 value:
 *                   code: 400
 *                   message: "Invalid log ID format"
 *                   error: "Bad Request"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               log_not_found:
 *                 summary: 日志不存在
 *                 value:
 *                   code: 404
 *                   message: "资源不存在"
 *                   error: "The specified log does not exist or you don't have permission to access it"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { log_id: string } }
): Promise<NextResponse<UserLogDetailResponse>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)

    if (!params.log_id) {
      return NextResponse.json(
        {
          code: 400,
          message: "Log_id is required",
          error: "Bad Request",
        },
        { status: 400 }
      )
    }

    const detail = await fetchLogs(params.log_id, group)

    return NextResponse.json({
      code: 200,
      data: detail || undefined,
    } satisfies UserLogDetailResponse)
  } catch (error) {
    console.error("Get logs detail error:", error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : "Internal server error",
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
