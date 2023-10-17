import { authSession } from '@/services/backend/auth';

import { jsonRes } from '@/services/backend/response';
import { enableRecharge } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) {
      return jsonRes(resp, { code: 401, message: 'token verify error' });
    }

    return jsonRes(resp, {
      code: 200,
      data: {
        ratios: '10,15,20,25,30',
        steps: '299,599,1999,4999,19999'
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price bonus  error' });
  }
}
