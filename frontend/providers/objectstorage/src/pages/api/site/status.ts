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
    const appName = `${config.objectStorage.hosting.appNamePrefix}-${bucket}`;
    const headers = {
      Authorization: req.headers.authorization
    };
    const result = await appLaunchpadClient.get('/getAppByAppName', {
      headers,
      params: {
        appName
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
