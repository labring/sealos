import { END_TIME, START_TIME } from '@/constants/payment';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { TransferType } from '@/types';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const {
      endTime = END_TIME,
      startTime = START_TIME,
      type = 0,
      orderID
    } = req.body as {
      endTime?: Date;
      orderID?: string;
      startTime?: Date;
      type?: TransferType;
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
      startTime,
      transferID: orderID,
      endTime,
      type
    };

    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const response = await client.post('/account/v1alpha1/get-transfer', data);
    if (response.status !== 200) {
      console.log(response.data);
      return jsonRes(resp, {
        data: {
          transfer: [],
          totalPage: 0,
          pageSize: 0
        }
      });
    }
    const res = response.data;
    return jsonRes(resp, {
      data: res.data
    });
  } catch (error) {
    jsonRes(resp, { code: 500, message: 'get billing error' });
  }
}
