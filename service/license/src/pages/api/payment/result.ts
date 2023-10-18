import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getSealosPay } from '@/services/pay';
import { PaymentParams, PaymentResultParams } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const { payMethod, sessionID, orderID } = req.body as PaymentResultParams;
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(resp, { code: 401, message: 'token verify error' });

    const { sealosPayUrl, sealosPayID, sealosPayKey } = getSealosPay();

    const result = await fetch(`${sealosPayUrl}/v1alpha1/pay/status`, {
      method: 'POST',
      body: JSON.stringify({
        appID: 45141910007488120,
        sign: '076f82f8e996d7',
        orderID: orderID,
        payMethod: 'stripe',
        user: 'jiahui',
        sessionID: 'cs_test_a1UH60aWlJpnbi6c1LA287ymXv0mWDYdT6oonpRduTs9zzSF6OU87WSXa2'
      })
    });

    return jsonRes(resp, {
      data: result
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, data: error });
  }
}
