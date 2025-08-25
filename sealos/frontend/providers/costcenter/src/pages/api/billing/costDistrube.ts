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
      appName,
      namespace
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      appType: string;
      appName: string;
      namespace: string;
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
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const body = JSON.stringify({
      endTime,
      startTime,
      appType,
      appName,
      namespace
    });
    const response = await client.post('/account/v1alpha1/cost-basic-distribution', body);
    const result = response.data;
    if (response.status !== 200) {
      console.log(result);
      throw Error('get cost overview error');
    }
    return jsonRes(resp, {
      code: 200,
      data: result.data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'interval server error' });
  }
}
