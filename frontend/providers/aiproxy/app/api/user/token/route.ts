import { NextRequest, NextResponse } from "next/server"

import { ApiProxyBackendResp, ApiResp } from "@/types/api"
import { TokenInfo } from "@/types/user/token"
import { checkSealosUserIsRealName, kcOrAppTokenAuth, parseJwtToken } from "@/utils/backend/auth"

export const dynamic = "force-dynamic"

type ApiProxyBackendTokenSearchResponse = ApiProxyBackendResp<{
  tokens: TokenInfo[]
  total: number
}>

export type GetTokensResponse = ApiResp<{
  tokens: TokenInfo[]
  total: number
}>

export interface GetTokensQueryParams {
  page: number
  perPage: number
}

function validateParams(queryParams: GetTokensQueryParams): string | null {
  if (queryParams.page < 1) {
    return "Page number must be greater than 0"
  }

  if (queryParams.perPage < 1 || queryParams.perPage > 100) {
    return "Per page must be between 1 and 100"
  }

  return null
}

async function fetchTokens(
  queryParams: GetTokensQueryParams,
  group: string
): Promise<{ tokens: TokenInfo[]; total: number }> {
  try {
    const url = new URL(
      `/api/token/${group}/search`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    url.searchParams.append("p", queryParams.page.toString())
    url.searchParams.append("per_page", queryParams.perPage.toString())

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

    const result: ApiProxyBackendTokenSearchResponse = await response.json()

    if (!result.success) {
      throw new Error(result.message || "API request failed")
    }

    return {
      tokens: result?.data?.tokens || [],
      total: result?.data?.total || 0,
    }
  } catch (error) {
    console.error("Error fetching tokens:", error)
    return {
      tokens: [],
      total: 0,
    }
  }
}

/**
 * @swagger
 * /api/user/token:
 *   get:
 *     tags:
 *       - Tokens
 *     summary: 获取 Token 列表
 *     description: |
 *       获取当前用户组的所有 API Token 列表，支持分页查询。
 *
 *       ### 权限要求
 *       - 需要有效的认证信息（Bearer Token 或 KC Token）
 *       - 只能查询当前用户组的 Token
 *
 *       ### 功能特性
 *       - 支持分页查询
 *       - 返回 Token 的基本信息（ID、名称、状态、创建时间等）
 *       - 不返回完整的 Token 密钥（安全考虑）
 *
 *       ### 使用示例
 *       - 获取第一页：`?page=1&perPage=10`
 *       - 获取更多数据：`?page=2&perPage=20`
 *     operationId: getTokens
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
 *     responses:
 *       200:
 *         description: 成功获取 Token 列表
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
 *                     tokens:
 *                       type: array
 *                       description: Token 列表
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: Token ID
 *                             example: 12345
 *                           name:
 *                             type: string
 *                             description: Token 名称
 *                             example: "my-api-token"
 *                           key:
 *                             type: string
 *                             description: Token 密钥（部分隐藏）
 *                             example: "sk-****abc123"
 *                           group:
 *                             type: string
 *                             description: 所属用户组
 *                             example: "ns-admin"
 *                           subnet:
 *                             type: string
 *                             description: 允许的子网
 *                             example: "0.0.0.0/0"
 *                           models:
 *                             type: array
 *                             nullable: true
 *                             description: 允许使用的模型列表（null 表示所有模型）
 *                             items:
 *                               type: string
 *                             example: ["gpt-4", "gpt-3.5-turbo"]
 *                           status:
 *                             type: integer
 *                             description: Token 状态（1=启用, 2=禁用）
 *                             example: 1
 *                           quota:
 *                             type: number
 *                             description: 总额度
 *                             example: 1000.0
 *                           used_amount:
 *                             type: number
 *                             description: 已使用金额
 *                             example: 250.5
 *                           request_count:
 *                             type: integer
 *                             description: 请求次数
 *                             example: 500
 *                           created_at:
 *                             type: integer
 *                             description: 创建时间戳（Unix 时间戳，秒级）
 *                             example: 1697001600
 *                           accessed_at:
 *                             type: integer
 *                             description: 最后访问时间戳（Unix 时间戳，秒级）
 *                             example: 1697088000
 *                           expired_at:
 *                             type: integer
 *                             description: 过期时间戳（Unix 时间戳，秒级，-1 表示永不过期）
 *                             example: -1
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 25
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   code: 200
 *                   data:
 *                     tokens:
 *                       - id: 12345
 *                         name: "production-api"
 *                         key: "sk-****abc123"
 *                         group: "ns-admin"
 *                         subnet: "0.0.0.0/0"
 *                         models: ["gpt-4", "gpt-3.5-turbo"]
 *                         status: 1
 *                         quota: 1000.0
 *                         used_amount: 250.5
 *                         request_count: 500
 *                         created_at: 1697001600
 *                         accessed_at: 1697088000
 *                         expired_at: -1
 *                       - id: 12346
 *                         name: "test-api"
 *                         key: "sk-****def456"
 *                         group: "ns-admin"
 *                         subnet: "0.0.0.0/0"
 *                         models: null
 *                         status: 2
 *                         quota: 500.0
 *                         used_amount: 50.0
 *                         request_count: 100
 *                         created_at: 1697001500
 *                         accessed_at: 1697001800
 *                         expired_at: 1697088000
 *                     total: 25
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(request: NextRequest): Promise<NextResponse<GetTokensResponse>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)

    const searchParams = request.nextUrl.searchParams
    const queryParams: GetTokensQueryParams = {
      page: parseInt(searchParams.get("page") || "1", 10),
      perPage: parseInt(searchParams.get("perPage") || "10", 10),
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

    const { tokens, total } = await fetchTokens(queryParams, group)

    return NextResponse.json({
      code: 200,
      data: {
        tokens,
        total,
      },
    } satisfies GetTokensResponse)
  } catch (error) {
    console.error("Token search error:", error)

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

// create token

interface CreateTokenRequest {
  name: string
}

function validateCreateParams(body: CreateTokenRequest): string | null {
  if (!body.name) {
    return "Name parameter is required"
  }
  return null
}

async function createToken(name: string, group: string): Promise<TokenInfo | undefined> {
  try {
    const url = new URL(
      `/api/token/${group}?auto_create_group=true`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp<TokenInfo> = await response.json()
    if (!result.success) {
      throw new Error(result.message || "Failed to create token")
    }

    return result?.data
  } catch (error) {
    console.error("Error creating token:", error)
    throw error
  }
}

/**
 * @swagger
 * /api/user/token:
 *   post:
 *     tags:
 *       - Tokens
 *     summary: 创建新的 API Token
 *     description: |
 *       为当前用户组创建一个新的 API Token，用于调用 AI 服务。
 *
 *       ### 权限要求
 *       - 需要有效的认证信息（Bearer Token 或 KC Token）
 *       - 用户必须已完成实名认证
 *       - Token 将关联到当前用户组
 *
 *       ### 功能特性
 *       - 自动生成唯一的 Token 密钥
 *       - 返回完整的 Token 信息（包括完整密钥，仅此一次）
 *       - 如果用户组不存在，将自动创建
 *       - Token 默认为启用状态
 *
 *       ### 重要提示
 *       - **创建后立即保存 Token 密钥，系统不会再次显示完整密钥**
 *       - Token 名称建议使用有意义的标识，便于管理
 *       - 创建的 Token 默认无过期时间
 *       - 未实名认证的用户无法创建 Token
 *     operationId: createToken
 *     security:
 *       - BearerAuth: []
 *       - KCAuth: []
 *     requestBody:
 *       required: true
 *       description: Token 创建参数
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Token 名称（必填，用于标识用途）
 *                 minLength: 1
 *                 example: "production-api-key"
 *           examples:
 *             create_production:
 *               summary: 创建生产环境 Token
 *               value:
 *                 name: "production-api-key"
 *             create_test:
 *               summary: 创建测试环境 Token
 *               value:
 *                 name: "test-environment"
 *     responses:
 *       200:
 *         description: Token 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   description: HTTP 状态码
 *                   example: 200
 *                 message:
 *                   type: string
 *                   description: 响应消息
 *                   example: "Token created successfully"
 *                 data:
 *                   type: object
 *                   description: 新创建的 Token 信息
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Token ID
 *                       example: 12345
 *                     name:
 *                       type: string
 *                       description: Token 名称
 *                       example: "production-api-key"
 *                     key:
 *                       type: string
 *                       description: 完整的 Token 密钥（仅创建时返回完整密钥）
 *                       example: "sk-1234567890abcdef1234567890abcdef"
 *                     group:
 *                       type: string
 *                       description: 所属用户组
 *                       example: "ns-admin"
 *                     subnet:
 *                       type: string
 *                       description: 允许的子网
 *                       example: "0.0.0.0/0"
 *                     models:
 *                       type: array
 *                       nullable: true
 *                       description: 允许使用的模型列表（null 表示所有模型）
 *                       items:
 *                         type: string
 *                       example: null
 *                     status:
 *                       type: integer
 *                       description: Token 状态（1=启用）
 *                       example: 1
 *                     quota:
 *                       type: number
 *                       description: 总额度
 *                       example: 0
 *                     used_amount:
 *                       type: number
 *                       description: 已使用金额
 *                       example: 0
 *                     request_count:
 *                       type: integer
 *                       description: 请求次数
 *                       example: 0
 *                     created_at:
 *                       type: integer
 *                       description: 创建时间戳（Unix 时间戳，秒级）
 *                       example: 1697001600
 *                     accessed_at:
 *                       type: integer
 *                       description: 最后访问时间戳（Unix 时间戳，秒级）
 *                       example: 0
 *                     expired_at:
 *                       type: integer
 *                       description: 过期时间戳（Unix 时间戳，秒级，-1 表示永不过期）
 *                       example: -1
 *             examples:
 *               success:
 *                 summary: 创建成功响应示例
 *                 value:
 *                   code: 200
 *                   message: "Token created successfully"
 *                   data:
 *                     id: 12345
 *                     name: "production-api-key"
 *                     key: "sk-1234567890abcdef1234567890abcdef"
 *                     group: "ns-admin"
 *                     subnet: "0.0.0.0/0"
 *                     models: null
 *                     status: 1
 *                     quota: 0
 *                     used_amount: 0
 *                     request_count: 0
 *                     created_at: 1697001600
 *                     accessed_at: 0
 *                     expired_at: -1
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               missing_name:
 *                 summary: 缺少名称参数
 *                 value:
 *                   code: 400
 *                   message: "Name parameter is required"
 *                   error: "Name parameter is required"
 *               not_real_name:
 *                 summary: 用户未实名认证
 *                 value:
 *                   code: 400
 *                   message: "key.userNotRealName"
 *                   error: "key.userNotRealName"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResp<TokenInfo>>> {
  try {
    const group = await kcOrAppTokenAuth(request.headers)
    const body: CreateTokenRequest = await request.json()

    const validationError = validateCreateParams(body)
    if (validationError) {
      return NextResponse.json(
        {
          code: 400,
          message: validationError,
          error: validationError,
        } satisfies ApiResp<TokenInfo>,
        { status: 400 }
      )
    }

    const isRealName = await checkSealosUserIsRealName(request.headers)

    if (!isRealName) {
      return NextResponse.json(
        {
          code: 400,
          message: "key.userNotRealName",
          error: "key.userNotRealName",
        },
        { status: 400 }
      )
    }
    // 创建Token
    const newToken = await createToken(body.name, group)

    return NextResponse.json({
      code: 200,
      data: newToken,
      message: "Token created successfully",
    } satisfies ApiResp<TokenInfo>)
  } catch (error) {
    console.error("Token creation error:", error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : "Internal server error",
        error: error instanceof Error ? error.message : "Internal server error",
      } satisfies ApiResp<TokenInfo>,
      { status: 500 }
    )
  }
}
