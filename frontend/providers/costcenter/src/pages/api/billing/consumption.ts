import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const {
      endTime,
      startTime,
      appType = '',
      namespace = '',
      appName = ''
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      appType?: string;
      namespace?: string;
      appName?: string;
    };
    if (!endTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    if (!startTime)
      return jsonRes(resp, {
        code: 400,
        message: 'startTime is invalid'
      });
    const bodyRaw = {
      endTime,
      startTime,
      appType,
      appName,
      namespace
    };
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return null;
    const results = await client.post('/account/v1alpha1/costs/consumption', bodyRaw);
    const data = results.data;
    if (results.status !== 200) {
      console.log(data);
      throw Error('get consumption error');
    }
    return jsonRes(resp, {
      code: 200,
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get consumption error' });
  }
}
