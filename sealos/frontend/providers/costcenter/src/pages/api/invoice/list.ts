import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
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
      startTime,
      page,
      pageSize
    };
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const response = await client.post('/account/v1alpha1/invoice/get', data);
    const res = response.data;
    if (response.status !== 200) {
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
