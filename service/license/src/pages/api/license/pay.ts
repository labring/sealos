import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { enableSealosPay } from '@/services/enable';
import { getSealosPay } from '@/services/pay';
import { GET } from '@/services/request';
import { PaymentParams } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const { amount, payMethod } = req.body as PaymentParams;
    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(resp, { code: 401, message: 'token verify error' });
    }
    const { SEALOS_PAY_UEL, SEALOS_PAY_ID, SEALOS_PAY_KEY } = getSealosPay();

    const result = await GET(SEALOS_PAY_UEL, {
      appID: SEALOS_PAY_ID,
      sign: SEALOS_PAY_KEY,
      amount: '199',
      currency: 'CNY',
      user: userInfo.uid,
      payMethod: 'stripe'
    });
    console.log(result);

    return jsonRes(resp, {
      data: 123
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, data: error });
  }
}
