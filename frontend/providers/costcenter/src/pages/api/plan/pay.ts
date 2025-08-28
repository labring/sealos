import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import {
  SubscriptionPayRequestSchema,
  PaymentResponse,
  SubscriptionPayRequest
} from '@/types/plan';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = SubscriptionPayRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters'
      });
    }

    const { workspace, regionDomain, planName, period, payMethod, operator, cardId } =
      parseResult.data;

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const headers: Record<string, string> = {};
    const deviceTokenId = req.headers['device-token-id'];
    if (deviceTokenId && typeof deviceTokenId === 'string') {
      headers['Device-Token-ID'] = deviceTokenId;
    }

    const requestBody: SubscriptionPayRequest = {
      workspace,
      regionDomain,
      planName,
      period,
      payMethod,
      operator
    };

    if (cardId) {
      requestBody.cardId = cardId;
    }

    console.log('requestBody', requestBody);
    const response = await client.post<PaymentResponse>(
      '/account/v1alpha1/workspace-subscription/pay',
      requestBody,
      { headers }
    );
    console.log('response', response);

    return jsonRes<PaymentResponse>(res, {
      data: response.data
    });
  } catch (error: any) {
    console.log('error', error);

    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
