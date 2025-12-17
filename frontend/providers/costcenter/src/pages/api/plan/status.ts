import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { PaymentStatusRequestSchema, PaymentStatusResponse } from '@/types/plan';
import { ApiResp } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = PaymentStatusRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: parseResult.error.message
      });
    }

    const { payId } = parseResult.data;

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const response = await client.post<ApiResp<PaymentStatusResponse>>(
      '/account/v1alpha1/payment/status',
      {
        payId
      }
    );
    console.log('response', response.data.data);

    return jsonRes<PaymentStatusResponse>(res, {
      data: response.data.data
    });
  } catch (error: any) {
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
