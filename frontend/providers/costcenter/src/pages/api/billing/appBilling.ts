import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { formatISO } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const {
      endTime = formatISO(new Date(), {
        representation: 'complete'
      }),
      startTime = formatISO(new Date(), {
        representation: 'complete'
      }),
      appType,
      orderID,
      appName,
      namespace,
      page = 1,
      pageSize = 100
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      appType: string;
      appName: string;
      namespace: string;
      orderID?: string;
      pageSize: number;
      page: number;
    };
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const bodyRaw = {
      endTime,
      startTime,
      appType,
      appName,
      orderID,
      namespace,
      page,
      pageSize
    };
    // const body = JSON.stringify(bodyRaw);
    const response = await client.post('/account/v1alpha1/costs/workspace/app', bodyRaw);
    console.log(JSON.stringify(response.data, null, 2));
    const res = response.data;
    if (response.status !== 200) {
      console.log(res);
      throw Error('get appbilling error');
    }
    const data = res.app_costs;
    return jsonRes(resp, {
      code: 200,
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get appbilling error' });
  }
}
