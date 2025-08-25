import { authSession } from '@/service/backend/auth';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { RechargeBillingData } from '@/types';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const {
      endTime,
      startTime,
      paymentID,
      page = 1,
      pageSize = 100,
      invoiced
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      paymentID?: string;
      page?: number;
      pageSize?: number;
      invoiced?: boolean;
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
      paymentID,
      startTime,
      page,
      invoiced,
      pageSize
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
      data: res.data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing error' });
  }
}
