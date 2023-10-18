import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { GET } from '@/services/request';
import { PaymentParams } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const { amount, payMethod } = req.body as PaymentParams;
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(resp, { code: 401, message: 'token verify error' });

    const result = await GET('http://localhost:2303/v1alpha1/pay/bill', {
      appID: 45141910007488120,
      sign: '076f82f8e996d7',
      orderID: 'iGP0mHMJfxfamCBqeA',
      payMethod: 'stripe',
      user: 'jiahui',
      sessionID: 'cs_test_a1UH60aWlJpnbi6c1LA287ymXv0mWDYdT6oonpRduTs9zzSF6OU87WSXa2'
    });

    return jsonRes(resp, {
      data: 123
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, data: error });
  }
}
