import { authSession } from '@/service/backend/auth';
import { makeAPIURL } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const { endTime, startTime } = req.body as {
      endTime?: Date;
      startTime?: Date;
    };
    if (!endTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    const queryRaw = {
      endTime,
      kubeConfig: kc.exportConfig(),
      startTime
    };

    const rechagreUrl = makeAPIURL(null, '/account/v1alpha1/costs/recharge');
    const response = await fetch(rechagreUrl, {
      method: 'POST',
      body: JSON.stringify(queryRaw)
    });
    const result = await response.json();
    if (!response.ok) {
      console.log(result);
      throw Error();
    }
    return jsonRes(resp, {
      data: result
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get recharge error' });
  }
}
