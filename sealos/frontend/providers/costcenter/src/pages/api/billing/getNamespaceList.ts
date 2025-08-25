import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
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
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const res = await client.post('/account/v1alpha1/namespaces', {
      endTime,
      startTime,
      type: 0
    });
    const data = res.data;
    return jsonRes(resp, {
      code: 200,
      data: data.data,
      message: data.message
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get namespaceList error' });
  }
}
