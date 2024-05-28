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
    const { endTime, startTime } = req.body as {
      endTime?: Date;
      startTime?: Date;
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
    const url =
      global.AppConfig.costCenter.components.accountService.url + '/account/v1alpha1/namespaces';
    const res = await (
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          endTime,
          kubeConfig: kc.exportConfig(),
          owner: user.name,
          startTime,
          type: 0
        })
      })
    ).json();
    return jsonRes(resp, {
      code: 200,
      data: res.data,
      message: res.message
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get namespaceList error' });
  }
}
