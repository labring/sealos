import { ApiResp, jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucketName } = req.body as { bucketName?: string };
    if (!bucketName) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
    const infoRes = await client.k8sCustomObjects.getNamespacedCustomObject(
      'objectstorage.sealos.io',
      'v1',
      client.namespace,
      'objectstoragebuckets',
      bucketName
    );
    jsonRes(res, { data: infoRes });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get bucket error'
    });
  }
}
