import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { getAppLaunchpadClient } from '@/services/request';
import { Config } from '@/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const config = Config();
    const appLaunchpadClient = getAppLaunchpadClient();
    const { bucket } = req.body as { bucket?: string };
    if (!bucket) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
    const name = `${config.objectStorage.hosting.appNamePrefix}-${bucket}`;
    const result = await appLaunchpadClient.delete('/delAppByName', {
      headers: {
        Authorization: req.headers.authorization
      },
      params: {
        name
      }
    });
    return jsonRes(res, {
      data: result.data.data
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get bucket error'
    });
  }
}
