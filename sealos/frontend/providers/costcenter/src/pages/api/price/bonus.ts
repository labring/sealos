import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.recharge.enabled) {
      throw new Error('recharge is not enabled');
    }
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return null;

    const response = await client.post<{
      discount: {
        defaultSteps: Record<string, number>;
        firstRechargeDiscount: Record<string, number>;
      };
    }>('/account/v1alpha1/recharge-discount');
    const data = response.data;
    if (!data || response.status !== 200)
      return jsonRes(resp, {
        code: 404,
        message: 'bonus is not found'
      });
    return jsonRes(resp, {
      code: 200,
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}
