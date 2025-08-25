import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }
    return jsonRes(res, {
      code: 200,
      data: {
        ratios: '10,15,20,25,30',
        steps: '299,599,1999,4999,19999'
      },
      message: 'asdasdasdasd'
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get price bonus  error' });
  }
}
