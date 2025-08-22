import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import {
  WorkspaceSubscriptionRequestSchema,
  SubscriptionInfoResponse,
  SubscriptionInfoResponseSchema
} from '@/types/plan';
import { ApiResp } from '@/types/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    // 验证请求参数
    const parseResult = WorkspaceSubscriptionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters',
        error: parseResult.error.flatten()
      });
    }

    const { workspace, regionDomain } = parseResult.data;

    // 创建 API 客户端
    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    // 调用后端 API
    const response = await client.post<ApiResp<SubscriptionInfoResponse>>(
      '/account/v1alpha1/workspace-subscription/info',
      {
        workspace,
        regionDomain
      }
    );

    // 尝试验证响应数据，但即使失败也返回数据
    const validatedResponse = SubscriptionInfoResponseSchema.safeParse(response.data?.data);
    if (!validatedResponse.success) {
      console.warn(
        'Response validation failed, but returning data anyway:',
        validatedResponse.error
      );
    }

    return jsonRes<SubscriptionInfoResponse>(res, {
      data: response.data?.data
    });
  } catch (error: any) {
    console.error('Error in workspace subscription info API:', error);

    // 处理后端 API 错误
    if (error.response?.data) {
      return jsonRes(res, {
        code: error.response.status || 500,
        message: error.response.data.message || 'Backend service error',
        error: error.response.data
      });
    }

    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
