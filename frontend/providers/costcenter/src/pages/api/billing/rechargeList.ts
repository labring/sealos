import { authSession } from '@/service/backend/auth';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { RechargeBillingData } from '@/types';
import { parseISO } from 'date-fns';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const { endTime, startTime } = req.body as {
      endTime?: Date;
      startTime?: Date;
    };
    if (!endTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    if (!startTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    const data = {
      endTime,
      // kubeConfig: kc.exportConfig(),
      // owner: user.name,
      startTime
    };
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const response = await client.post('/account/v1alpha1/payment', data);
    if (response.status !== 200)
      return jsonRes(resp, {
        code: 404,
        data: {
          payment: []
        }
      });
    const res = response.data as { data: RechargeBillingData };
    return jsonRes(resp, {
      data: res.data.payments.map((payment) => [
        parseISO(payment.CreatedAt).getTime(),
        payment.Amount
      ])
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing error' });
  }
}
