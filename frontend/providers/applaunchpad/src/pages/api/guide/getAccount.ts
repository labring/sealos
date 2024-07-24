import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (!global.AppConfig.common.guideEnabled) return jsonRes(res, { data: null });
    const kubeconfig = await authSession(req.headers);
    const domain = global.AppConfig.cloud.domain;

    const response = await fetch(`https://${domain}/api/v1alpha/account/getAccount`, {
      method: 'GET',
      headers: {
        Authorization: encodeURIComponent(kubeconfig)
      }
    });
    const result: {
      code: number;
      data: any;
      message: string;
    } = await response.json();

    if (result.code !== 200) {
      return jsonRes(res, { code: result.code, message: 'desktop api is err' });
    } else {
      return jsonRes(res, { data: result.data });
    }
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
