import { authSession } from '@/service/backend/auth';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { formatISO } from 'date-fns';
import { getRegionByUid, makeAPIURL } from '@/service/backend/region';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const {
      endTime = formatISO(new Date(), {
        representation: 'complete'
      }),
      startTime = formatISO(new Date(), {
        representation: 'complete'
      }),
      regionUid,
      appType,
      appName,
      namespace
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      regionUid: string;
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
    const region = await getRegionByUid(regionUid);
    const url = makeAPIURL(region, '/account/v1alpha1/cost-basic-distribution');
    const body = JSON.stringify({
      endTime,
      kubeConfig: kc.exportConfig(),
      startTime,
      appType,
      appName,
      namespace
    });
    const response = await fetch(url, {
      method: 'POST',
      body
    });
    if (!response.ok) {
      throw Error('get cost overview error');
    }
    const result = await response.json();
    return jsonRes(resp, {
      code: 200,
      data: result.data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'interval server error' });
  }
}
