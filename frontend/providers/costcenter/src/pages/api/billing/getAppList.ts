import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const url =
      global.AppConfig.costCenter.components.accountService.url +
      '/account/v1alpha1/cost-app-type-list';
    const res = await (
      await fetch(url, {
        method: 'POST'
      })
    ).json();
    const appMap = res.data;
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
