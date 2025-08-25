import { authSession } from '@/service/backend/auth';
import { getRegionList, makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const {
      endTime,
      startTime,
      regionUid,
      appType = '',
      appName = '',
      namespace = ''
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      regionUid: string;
      appType?: string;
      appName?: string;
      namespace?: string;
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
    const regions = await getRegionList();
    if (!regions) throw Error('get all regions error');
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;
    const bodyRaw = {
      endTime,
      // kubeConfig: kc.exportConfig(),
      startTime,
      appType,
      appName,
      namespace
    };
    const body = JSON.stringify(bodyRaw);
    const resRaw = await client.post('/account/v1alpha1/costs', bodyRaw);
    const result = resRaw.data as { data: { costs: [number, string][] } };
    if (resRaw.status !== 200) {
      console.log(result);
      throw Error('get costs list error');
    }
    const data = result.data.costs;
    return jsonRes(resp, {
      code: 200,
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing cost error' });
  }
}
