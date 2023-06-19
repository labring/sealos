import { authSession } from '@/service/backend/auth';
import {
  CRDMeta,
  GetCRD,
  GetConfigMap,
  GetUserDefaultNameSpace
} from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 401, message: 'user null' });
    }

    const result = await GetConfigMap(kc, 'sealos', 'recharge-gift');
    if (!result.body.data) {
      return jsonRes(resp, { code: 404, message: 'not found' });
    }
    return jsonRes(resp, {
      code: 200,
      data: {
        ratios: result.body.data.ratios,
        steps: result.body.data.steps
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}
