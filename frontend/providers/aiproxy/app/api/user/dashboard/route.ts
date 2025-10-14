import { NextRequest, NextResponse } from "next/server"

import { ApiProxyBackendResp, ApiResp } from "@/types/api"
import { DashboardData } from "@/types/user/dashboard"
import { DashboardResponse } from "@/types/user/dashboard"
import { kcOrAppTokenAuth, parseJwtToken } from "@/utils/backend/auth"

// 定义API响应数据结构
export type ApiProxyBackendDashboardResponse = ApiProxyBackendResp<DashboardData>

// 定义查询参数接口
export interface DashboardQueryParams {
  type: "day" | "week" | "two_week" | "month"
  model?: string
  token_name?: string
  start_timestamp?: string
  end_timestamp?: string
  timezone?: string
  timespan?: "day" | "hour"
}

// 获取仪表盘数据
async function fetchDashboardData(
  params: DashboardQueryParams,
  group: string
): Promise<DashboardData> {
  try {
    const url = new URL(
      `/api/dashboard/${group}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )

    if (params.type) {
      url.searchParams.append("type", params.type)
    }

    if (params.start_timestamp) {
      url.searchParams.append("start_timestamp", params.start_timestamp)
    }

    if (params.end_timestamp) {
      url.searchParams.append("end_timestamp", params.end_timestamp)
    }

    if (params.timezone) {
      url.searchParams.append("timezone", params.timezone)
    }

    if (params.timespan) {
      url.searchParams.append("timespan", params.timespan)
    }

    if (params.model) {
      url.searchParams.append("model", params.model)
    }

    if (params.token_name) {
      url.searchParams.append("token_name", params.token_name)
    }

    url.searchParams.append("result_only", "true")

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

    const result: ApiProxyBackendDashboardResponse = await response.json()
    if (!result.success) {
      throw new Error(result.message || "API request failed")
    }

    return result.data!
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    throw error
  }
}

/**
 * @swagger
 * /api/user/dashboard:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: 获取仪表盘统计数据
 *     description: |
 *       获取 API 使用情况的统计数据，包括请求次数、消费金额、模型使用分布等信息。
 *
 *       ### 权限要求
 *       - 需要有效的认证信息（Bearer Token 或 KC Token）
 *       - 只能查询当前用户组的统计数据
 *
 *       ### 功能特性
 *       - 支持按时间范围筛选（天、周、双周、月）
 *       - 支持按模型筛选统计数据
 *       - 支持按 Token 名称筛选
 *       - 支持自定义时间戳范围
 *       - 支持时区设置
 *       - 支持时间粒度选择（小时/天）
 *
 *       ### 使用示例
 *       - 获取最近一周数据：`?type=week`
 *       - 获取特定模型数据：`?type=month&model=gpt-4`
 *       - 自定义时间范围：`?start_timestamp=1697001600&end_timestamp=1697088000`
 *     operationId: getDashboardData
 *     security:
 *       - BearerAuth: []
 *       - KCAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         required: false
 *         description: 预定义的时间范围类型
 *         schema:
 *           type: string
 *           enum: [day, week, two_week, month]
 *         example: "week"
 *       - name: model
 *         in: query
 *         required: false
 *         description: 筛选指定模型的统计数据
 *         schema:
 *           type: string
 *         example: "gpt-4"
 *       - name: token_name
 *         in: query
 *         required: false
 *         description: 筛选指定 Token 名称的统计数据
 *         schema:
 *           type: string
 *         example: "my-api-token"
 *       - name: start_timestamp
 *         in: query
 *         required: false
 *         description: 自定义开始时间戳（Unix 时间戳，秒级）
 *         schema:
 *           type: string
 *         example: "1697001600"
 *       - name: end_timestamp
 *         in: query
 *         required: false
 *         description: 自定义结束时间戳（Unix 时间戳，秒级）
 *         schema:
 *           type: string
 *         example: "1697088000"
 *       - name: timezone
 *         in: query
 *         required: false
 *         description: 时区设置，用于正确显示时间数据
 *         schema:
 *           type: string
 *         example: "Asia/Shanghai"
 *       - name: timespan
 *         in: query
 *         required: false
 *         description: 数据聚合的时间粒度
 *         schema:
 *           type: string
 *           enum: [hour, day]
 *         example: "day"
 *     responses:
 *       200:
 *         description: 成功获取仪表盘数据
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
 *                   description: 仪表盘统计数据
 *                   properties:
 *                     chart_data:
 *                       type: array
 *                       description: 图表时间序列数据
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: integer
 *                             description: 时间戳（Unix 时间戳，秒级）
 *                             example: 1697001600
 *                           request_count:
 *                             type: integer
 *                             description: 请求次数
 *                             example: 125
 *                           used_amount:
 *                             type: number
 *                             description: 消费金额
 *                             example: 2.34
 *                           exception_count:
 *                             type: integer
 *                             description: 异常次数
 *                             example: 5
 *                           max_tpm:
 *                             type: integer
 *                             description: 最大每分钟 Token 数
 *                             example: 15000
 *                           max_rpm:
 *                             type: integer
 *                             description: 最大每分钟请求数
 *                             example: 100
 *                           max_rps:
 *                             type: integer
 *                             description: 最大每秒请求数
 *                             example: 10
 *                           max_tps:
 *                             type: integer
 *                             description: 最大每秒 Token 数
 *                             example: 500
 *                     token_names:
 *                       type: array
 *                       description: 可用的 Token 名称列表
 *                       items:
 *                         type: string
 *                       example: ["my-api-token", "test-token"]
 *                     models:
 *                       type: array
 *                       description: 可用的模型名称列表
 *                       items:
 *                         type: string
 *                       example: ["gpt-4", "gpt-3.5-turbo"]
 *                     total_count:
 *                       type: integer
 *                       description: 总请求次数
 *                       example: 1250
 *                     exception_count:
 *                       type: integer
 *                       description: 总异常次数
 *                       example: 15
 *                     used_amount:
 *                       type: number
 *                       description: 总消费金额
 *                       example: 15.67
 *                     rpm:
 *                       type: integer
 *                       description: 当前每分钟请求数
 *                       example: 50
 *                     tpm:
 *                       type: integer
 *                       description: 当前每分钟 Token 数
 *                       example: 8000
 *                     max_tpm:
 *                       type: integer
 *                       description: 最大每分钟 Token 数
 *                       example: 15000
 *                     max_rpm:
 *                       type: integer
 *                       description: 最大每分钟请求数
 *                       example: 100
 *                     max_rps:
 *                       type: integer
 *                       description: 最大每秒请求数
 *                       example: 10
 *                     max_tps:
 *                       type: integer
 *                       description: 最大每秒 Token 数
 *                       example: 500
 *                     input_tokens:
 *                       type: integer
 *                       description: 总输入 Token 数
 *                       example: 50000
 *                     output_tokens:
 *                       type: integer
 *                       description: 总输出 Token 数
 *                       example: 25000
 *                     total_tokens:
 *                       type: integer
 *                       description: 总 Token 数（输入+输出）
 *                       example: 75000
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   code: 200
 *                   data:
 *                     chart_data:
 *                       - timestamp: 1697001600
 *                         request_count: 125
 *                         used_amount: 2.34
 *                         exception_count: 2
 *                         max_tpm: 12000
 *                         max_rpm: 80
 *                         max_rps: 8
 *                         max_tps: 400
 *                       - timestamp: 1697088000
 *                         request_count: 200
 *                         used_amount: 3.56
 *                         exception_count: 3
 *                         max_tpm: 15000
 *                         max_rpm: 100
 *                         max_rps: 10
 *                         max_tps: 500
 *                     token_names: ["my-api-token", "test-token"]
 *                     models: ["gpt-4", "gpt-3.5-turbo"]
 *                     total_count: 1250
 *                     exception_count: 15
 *                     used_amount: 15.67
 *                     rpm: 50
 *                     tpm: 8000
 *                     max_tpm: 15000
 *                     max_rpm: 100
 *                     max_rps: 10
 *                     max_tps: 500
 *                     input_tokens: 50000
 *                     output_tokens: 25000
 *                     total_tokens: 75000
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               invalid_type:
 *                 summary: 无效的时间范围类型
 *                 value:
 *                   code: 400
 *                   message: "请求参数错误"
 *                   error: "Invalid type parameter. Must be one of: day, week, two_week, month"
 *               invalid_timespan:
 *                 summary: 无效的时间粒度
 *                 value:
 *                   code: 400
 *                   message: "请求参数错误"
 *                   error: "Invalid timespan parameter. Must be one of: hour, day"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               server_error:
 *                 summary: 服务器内部错误
 *                 value:
 *                   code: 500
 *                   message: "Internal server error"
 *                   error: "Failed to fetch dashboard data from backend"
 */
export async function GET(request: NextRequest): Promise<NextResponse<DashboardResponse>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)
    const searchParams = request.nextUrl.searchParams

    const queryParams: DashboardQueryParams = {
      type: (searchParams.get("type") as "day" | "week" | "two_week" | "month") || undefined,
      model: searchParams.get("model") || undefined,
      start_timestamp: searchParams.get("start_timestamp") || undefined,
      end_timestamp: searchParams.get("end_timestamp") || undefined,
      timezone: searchParams.get("timezone") || undefined,
      timespan: (searchParams.get("timespan") as "day" | "hour") || undefined,
      token_name: searchParams.get("token_name") || undefined,
    }

    const dashboardData = await fetchDashboardData(queryParams, group)

    return NextResponse.json({
      code: 200,
      data: dashboardData,
    } satisfies DashboardResponse)
  } catch (error) {
    console.error("Dashboard fetch error:", error)
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
