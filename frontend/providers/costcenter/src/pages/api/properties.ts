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
    const url =
      global.AppConfig.costCenter.components.accountService.url + '/account/v1alpha1/properties';
    const res = await (
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          kubeConfig: kc.exportConfig(),
          owner: user.name
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
    jsonRes(resp, { code: 500, message: 'get billing cost error' });
  }
}
