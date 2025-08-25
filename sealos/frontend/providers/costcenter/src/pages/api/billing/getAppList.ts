import { makeAPIClient } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const client = await makeAPIClient(null);
    const res = await client.post('/account/v1alpha1/cost-app-type-list');

    const appMap = res.data.data;
    return jsonRes(resp, {
      code: 200,
      data: {
        appMap
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}
