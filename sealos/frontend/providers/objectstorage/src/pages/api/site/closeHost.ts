import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { appLanuchPadClient } from '@/services/request';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucket } = req.body as { bucket?: string };
    if (!bucket) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
    const name = `static-host-${bucket}`;
    const result = await appLanuchPadClient.delete('/delAppByName', {
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
