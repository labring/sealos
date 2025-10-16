import { NextRequest, NextResponse } from 'next/server'

import { ApiProxyBackendResp, ApiResp } from '@/types/api'
import { checkSealosUserIsRealName, kcOrAppTokenAuth, parseJwtToken } from '@/utils/backend/auth'

export const dynamic = 'force-dynamic'

async function deleteToken(group: string, id: string): Promise<void> {
  try {
    const url = new URL(
      `/api/token/${group}/${id}`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete token')
    }
  } catch (error) {
    console.error('Error deleting token:', error)
    throw error
  }
}

/**
 * @swagger
 * /api/user/token/{id}:
 *   delete:
 *     tags:
 *       - Tokens
 *     summary: 删除指定的 Token
 *     description: |
 *       根据 Token ID 删除指定的 Token。此操作为不可逆操作，请谨慎执行。
 *
 *       ### 权限要求
 *       - 需要有效的认证信息（Bearer Token 或 KC Token）
 *       - 只能删除属于当前用户组的 Token
 *       - 无法删除其他用户或组的 Token
 *
 *       ### 注意事项
 *       - 删除操作立即生效
 *       - 已删除的 Token 将无法恢复
 *       - 使用已删除的 Token 进行 API 调用将返回 401 错误
 *     operationId: deleteTokenById
 *     security:
 *       - BearerAuth: []
 *       - KCAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Token 的唯一标识符 ID
 *         schema:
 *           type: string
 *           minLength: 1
 *         example: "sk-abc123def456"
 *     responses:
 *       200:
 *         description: Token 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResp'
 *             examples:
 *               success:
 *                 summary: 删除成功
 *                 value:
 *                   code: 200
 *                   message: "Token deleted successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               missing_id:
 *                 summary: 缺少 Token ID
 *                 value:
 *                   code: 400
 *                   message: "Token ID is required"
 *                   error: "Bad Request"
 *               invalid_id:
 *                 summary: Token ID 格式错误
 *                 value:
 *                   code: 400
 *                   message: "Invalid Token ID format"
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
 *               token_not_found:
 *                 summary: Token 不存在
 *                 value:
 *                   code: 404
 *                   message: "Token not found"
 *                   error: "The specified token does not exist or has been deleted"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResp>> {
  try {
    const userGroup = await kcOrAppTokenAuth(request.headers)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Token ID is required',
          error: 'Bad Request',
        },
        { status: 400 }
      )
    }

    await deleteToken(userGroup, params.id)

    return NextResponse.json({
      code: 200,
      message: 'Token deleted successfully',
    } satisfies ApiResp)
  } catch (error) {
    console.error('Token deletion error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error',
      } satisfies ApiResp,
      { status: 500 }
    )
  }
}

// update token status
interface UpdateTokenRequestBody {
  status: number
}

async function updateToken(group: string, id: string, status: number): Promise<void> {
  try {
    if (status !== 1 && status !== 2) {
      throw new Error('Invalid status')
    }
    const url = new URL(
      `/api/token/${group}/${id}/status`,
      global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
    )
    const token = global.AppConfig?.auth.aiProxyBackendKey

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
      body: JSON.stringify({ status }),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiProxyBackendResp = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to update token')
    }
  } catch (error) {
    console.error('Error updating token:', error)
    throw error
  }
}

/**
 * @swagger
 * /api/user/token/{id}:
 *   post:
 *     tags:
 *       - Tokens
 *     summary: 更新 Token 状态
 *     description: |
 *       更新指定 Token 的状态（启用或禁用）。此操作立即生效。
 *
 *       ### 权限要求
 *       - 需要有效的认证信息（Bearer Token 或 KC Token）
 *       - 用户必须已完成实名认证
 *       - 只能更新属于当前用户组的 Token
 *       - 无法更新其他用户或组的 Token
 *
 *       ### 功能特性
 *       - 支持启用（status=1）和禁用（status=2）操作
 *       - 禁用的 Token 无法调用 API
 *       - 可随时重新启用已禁用的 Token
 *       - 状态更改立即生效
 *
 *       ### 使用场景
 *       - 临时禁用某个 Token（例如发现安全问题）
 *       - 重新启用之前禁用的 Token
 *       - 管理多个 Token 的使用状态
 *
 *       ### 注意事项
 *       - 禁用 Token 不会删除其历史记录
 *       - 已禁用的 Token 仍会出现在列表中
 *       - 未实名认证的用户无法更新 Token 状态
 *     operationId: updateTokenStatus
 *     security:
 *       - BearerAuth: []
 *       - KCAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Token 的唯一标识符 ID
 *         schema:
 *           type: string
 *           minLength: 1
 *         example: "tk_abc123def456"
 *     requestBody:
 *       required: true
 *       description: Token 状态更新参数
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: integer
 *                 description: Token 状态（1=启用, 2=禁用）
 *                 enum: [1, 2]
 *                 example: 1
 *           examples:
 *             enable_token:
 *               summary: 启用 Token
 *               value:
 *                 status: 1
 *             disable_token:
 *               summary: 禁用 Token
 *               value:
 *                 status: 2
 *     responses:
 *       200:
 *         description: Token 状态更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResp'
 *             examples:
 *               success:
 *                 summary: 更新成功
 *                 value:
 *                   code: 200
 *                   message: "Token updated successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               missing_id:
 *                 summary: 缺少 Token ID
 *                 value:
 *                   code: 400
 *                   message: "Token ID is required"
 *                   error: "Bad Request"
 *               invalid_status:
 *                 summary: 状态值无效
 *                 value:
 *                   code: 400
 *                   message: "Status must be a number"
 *                   error: "Bad Request"
 *               not_real_name:
 *                 summary: 用户未实名认证
 *                 value:
 *                   code: 400
 *                   message: "key.userNotRealName"
 *                   error: "key.userNotRealName"
 *               status_out_of_range:
 *                 summary: 状态值超出范围
 *                 value:
 *                   code: 400
 *                   message: "Invalid status"
 *                   error: "Status must be 1 (enabled) or 2 (disabled)"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResp'
 *             examples:
 *               token_not_found:
 *                 summary: Token 不存在
 *                 value:
 *                   code: 404
 *                   message: "Token not found"
 *                   error: "The specified token does not exist"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResp>> {
  try {
    const userGroup = await kcOrAppTokenAuth(request.headers)

    if (!params.id) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Token ID is required',
          error: 'Bad Request',
        },
        { status: 400 }
      )
    }

    const isRealName = await checkSealosUserIsRealName(request.headers)

    if (!isRealName) {
      return NextResponse.json(
        {
          code: 400,
          message: 'key.userNotRealName',
          error: 'key.userNotRealName',
        },
        { status: 400 }
      )
    }

    const updateTokenBody: UpdateTokenRequestBody = await request.json()

    if (typeof updateTokenBody.status !== 'number') {
      return NextResponse.json(
        {
          code: 400,
          message: 'Status must be a number',
          error: 'Bad Request',
        },
        { status: 400 }
      )
    }

    await updateToken(userGroup, params.id, updateTokenBody.status)

    return NextResponse.json({
      code: 200,
      message: 'Token updated successfully',
    } satisfies ApiResp)
  } catch (error) {
    console.error('Token update error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error',
      } satisfies ApiResp,
      { status: 500 }
    )
  }
}
