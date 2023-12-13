import { authSession } from '@/services/backend/auth';
import { GetConfigMap } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) {
      return jsonRes(resp, { code: 401, message: 'token verify error' });
    }
    const result = await GetConfigMap(payload.kc, 'sealos', 'recharge-gift');
    if (!result.body.data) {
      return jsonRes(resp, { code: 404, message: 'not found' });
    }
    return jsonRes(resp, {
      code: 200,
      data: {
        ratios: result.body.data.ratios,
        steps: result.body.data.steps,
        activities: result.body.data.activities
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}
