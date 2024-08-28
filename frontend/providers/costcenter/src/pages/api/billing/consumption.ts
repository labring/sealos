import { authSession } from '@/service/backend/auth';
import { getRegionByUid, makeAPIURL } from '@/service/backend/region';
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
      appType = '',
      namespace = '',
      appName = '',
      regionUid
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      appType?: string;
      namespace?: string;
      appName?: string;
      regionUid?: string;
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
      kubeConfig: kc.exportConfig(),
      startTime,
      appType,
      appName,
      namespace
    };
    const region = await getRegionByUid(regionUid);
    const consumptionUrl = makeAPIURL(region, '/account/v1alpha1/costs/consumption');

    const results = await fetch(consumptionUrl, {
      method: 'POST',
      body: JSON.stringify(bodyRaw)
    });
    const data = await results.json();
    if (!results.ok) {
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
