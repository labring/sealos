import { authAppToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (!global.AppConfig.common.guideEnabled) return jsonRes(res, { data: null });
    const token = await authAppToken(req.headers);
    if (!token) {
      return jsonRes(res, { code: 401, message: 'token is valid' });
    }

    const { taskId } = req.body as { taskId: string };
    if (!taskId) return jsonRes(res, { code: 400, message: 'Bad Request: Invalid parameters' });

    const domain = global.AppConfig.cloud.desktopDomain;

    const response = await fetch(`https://${domain}/api/account/updateTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify({ taskId })
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
