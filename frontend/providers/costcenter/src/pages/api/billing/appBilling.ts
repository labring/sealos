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
      orderID,
      appName,
      namespace,
      page = 1,
      pageSize = 100
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      regionUid: string;
      appType: string;
      appName: string;
      namespace: string;
      orderID?: string;
      pageSize: number;
      page: number;
    };

    const region = await getRegionByUid(regionUid);
    const url = makeAPIURL(region, '/account/v1alpha1/costs/app');
    const bodyRaw = {
      endTime,
      kubeConfig: kc.exportConfig(),
      startTime,
      appType,
      appName,
      orderID,
      namespace,
      page,
      pageSize
    };
    const body = JSON.stringify(bodyRaw);
    const response = await fetch(url, {
      method: 'POST',
      body
    });
    const res = await response.json();
    if (!response.ok) {
      console.log(res);
      throw Error('get appbilling error');
    }
    const data = res.app_costs;
    return jsonRes(resp, {
      code: 200,
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get appbilling error' });
  }
}
