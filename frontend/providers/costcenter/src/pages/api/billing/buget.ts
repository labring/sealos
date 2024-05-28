import { authSession } from '@/service/backend/auth';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const { endTime, startTime, appType, namespace } = req.body as {
      endTime?: Date;
      startTime?: Date;
      appType?: string;
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
        message: 'startTime is invalid'
      });
    const base = global.AppConfig.costCenter.components.accountService.url as string;
    const consumptionUrl = base + '/account/v1alpha1/costs/consumption';
    const rechagreUrl = base + '/account/v1alpha1/costs/recharge';

    const results = await Promise.all([
      (
        await fetch(consumptionUrl, {
          method: 'POST',
          body: JSON.stringify({
            endTime,
            kubeConfig: kc.exportConfig(),
            owner: user.name,
            appType,
            namespace,
            startTime
          })
        })
      ).json(),
      (
        await fetch(rechagreUrl, {
          method: 'POST',
          body: JSON.stringify({
            endTime,
            kubeConfig: kc.exportConfig(),
            owner: user.name,
            appType
          })
        })
      ).json()
    ]);

    return jsonRes(resp, {
      code: 200,
      data: results
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get buget error' });
  }
}
