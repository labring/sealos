import { authSession } from '@/service/backend/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/backend/response';
import { GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { BillingSpec, InvoiceListData, RechargeBillingData } from '@/types';
import { parseISO } from 'date-fns';
import { makeAPIURL } from '@/service/backend/region';

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
      pageSize = 10,
      page = 1
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      pageSize?: number;
      page?: number;
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
      kubeConfig: kc.exportConfig(),
      startTime,
      page,
      pageSize
    };
    const url = makeAPIURL(null, '/account/v1alpha1/invoice/get');
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const res = await response.json();
    if (!response.ok) {
      throw Error(res);
    }
    return jsonRes(resp, {
      data: res.data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get invoice error' });
  }
}
