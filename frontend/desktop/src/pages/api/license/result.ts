import { authSession } from '@/services/backend/auth';
import { GetCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(resp, { code: 401, message: 'token verify error' });

    const { paymentName } = req.query as {
      paymentName: string;
    };

    if (typeof paymentName !== 'string' || paymentName === '') {
      return jsonRes(resp, { code: 400, message: 'payment name cannot be empty' });
    }

    const paymentM = {
      group: 'infostream.sealos.io',
      version: 'v1',
      namespace: payload.user.nsid,
      plural: 'payments'
    };
    const paymentDesc = await GetCRD(payload.kc, paymentM, paymentName);
    console.log(paymentDesc?.body?.status, 'payment');
    return jsonRes(resp, { data: paymentDesc?.body?.status });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, data: error });
  }
}
