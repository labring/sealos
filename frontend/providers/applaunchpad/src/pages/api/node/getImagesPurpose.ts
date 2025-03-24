import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req.headers);
    const domain = process.env.SERVER_BASE_URL;

    const response = await fetch(`${domain}/getImageUse`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: encodeURIComponent(kubeconfig)
      },
    });
    const result = await response.json();
    console.log('resultresult>>>', result)
    if (result) {
      return jsonRes(res, { data: {data: result} });
    } else {
      // error
      return jsonRes(res, { code: 500, message: 'result.error' });
    }
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}