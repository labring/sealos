import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.transferEnabled) {
      throw new Error('transfer is not enabled');
    }
    const { amount, to: toUser } = req.body;
    if (amount <= 0) {
      return jsonRes(resp, {
        code: 400,
        message: 'Amount cannot be less than 0'
      });
    }
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const body = JSON.stringify({
      toUser,
      amount
    });

    const response = await client.post('/account/v1alpha1/transfer', body);
    if (response.status !== 200) {
      return jsonRes(resp, {
        code: 409,
        message: 'transfer failed'
      });
    }
    return jsonRes(resp, {
      code: 200,
      message: 'transfer success'
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'transfer error' });
  }
}
