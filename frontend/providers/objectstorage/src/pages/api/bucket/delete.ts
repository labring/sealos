import { ApiResp, jsonRes } from '@/services/backend/response';
import { V1Status } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucketName } = req.body as { bucketName?: string };
    if (!bucketName) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
    await client.k8sCustomObjects
      .deleteNamespacedCustomObject(
        'objectstorage.sealos.io',
        'v1',
        client.namespace,
        'objectstoragebuckets',
        bucketName.replace(client.namespace.replace('ns-', '') + '-', '')
      )
      .then(
        () => jsonRes(res, { message: 'successfully' }),
        (err: { body: V1Status }) =>
          jsonRes(res, { code: err.body.code, message: err.body.message })
      );
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'delete bucket error'
    });
  }
}
