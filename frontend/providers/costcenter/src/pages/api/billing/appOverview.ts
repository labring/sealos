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
      namespace,
      pageSize,
      page
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      appType: string;
      appName: string;
      namespace: string;
      pageSize: number;
      page: number;
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
    if (!page)
      return jsonRes(resp, {
        code: 400,
        message: 'page is invalid'
      });
    if (!pageSize)
      return jsonRes(resp, {
        code: 400,
        message: 'pageSize is invalid'
      });
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return null;
    const bodyRaw = {
      endTime,
      startTime,
      appType,
      appName,
      namespace,
      page,
      pageSize
    };

    const response = await client.post('/account/v1alpha1/cost-overview', bodyRaw);
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
