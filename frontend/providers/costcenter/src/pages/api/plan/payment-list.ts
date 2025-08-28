import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { PaymentListRequestSchema, PaymentListResponse, PaymentListRequest } from '@/types/plan';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = PaymentListRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters'
      });
    }

    const { startTime, endTime, regionUid } = parseResult.data;

    const client = await makeAPIClientByHeader(req, res);
    if (!client) {
      return jsonRes(res, {
        code: 500,
        message: 'Internal server error'
      });
    }

    const requestBody: PaymentListRequest = {
      startTime,
      endTime,
      regionUid
    };

    const response = await client.post<PaymentListResponse>(
      '/account/v1alpha1/workspace-subscription/payment-list',
      {
        data: requestBody
      }
    );

    if (!response?.data) {
      return jsonRes(res, {
        code: 500,
        message: 'Internal server error'
      });
    }

    return jsonRes(res, {
      data: {
        payments: response.data?.payments || []
      }
    });
  } catch (error: any) {
    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
