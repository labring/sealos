import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { SubscriptionPayRequestSchema, PaymentResponse, PaymentResponseSchema } from '@/types/plan';
import { ApiResp } from '@/types/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    // 验证请求参数
    const parseResult = SubscriptionPayRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters',
        error: parseResult.error.flatten()
      });
    }

    const { workspace, regionDomain, planName, period, payMethod, operator, cardId } =
      parseResult.data;

    // 创建 API 客户端
    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    // 准备请求头（包含可选的 Device-Token-ID）
    const headers: Record<string, string> = {};
    const deviceTokenId = req.headers['device-token-id'];
    if (deviceTokenId && typeof deviceTokenId === 'string') {
      headers['Device-Token-ID'] = deviceTokenId;
    }

    // 准备请求体
    const requestBody: any = {
      workspace,
      regionDomain,
      planName,
      period,
      payMethod,
      operator
    };

    // 如果提供了 cardId，则添加到请求体
    if (cardId) {
      requestBody.cardId = cardId;
    }

    // 调用后端 API
    const response = await client.post<ApiResp<PaymentResponse>>(
      '/account/v1alpha1/workspace-subscription/pay',
      requestBody,
      { headers }
    );

    // 尝试验证响应数据，但即使失败也返回数据
    const validatedResponse = PaymentResponseSchema.safeParse(response.data?.data);
    if (!validatedResponse.success) {
      console.warn(
        'Response validation failed, but returning data anyway:',
        validatedResponse.error
      );
    }

    return jsonRes<PaymentResponse>(res, {
      data: response.data?.data
    });
  } catch (error: any) {
    console.error('Error in workspace subscription pay API:', error);

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
