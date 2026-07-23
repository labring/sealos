import { ApiResp, jsonRes } from '@/services/backend/response';
import { appLanuchPadClient } from '@/services/request';
import { V1Status } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucketName } = req.body as { bucketName?: string };
    if (!bucketName) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
    const name = `static-host-${bucketName}`;
    const [deleteCrResult, deleteHostResult] = await Promise.allSettled([
      client.k8sCustomObjects.deleteNamespacedCustomObject(
        'objectstorage.sealos.io',
        'v1',
        client.namespace,
        'objectstoragebuckets',
        bucketName.replace(client.namespace.replace('ns-', '') + '-', '')
      ),
      appLanuchPadClient.delete('/delAppByName', {
        headers: {
          Authorization: req.headers.authorization
        },
        params: {
          name
        }
      })
    ]);
    if (deleteCrResult.status == 'fulfilled') return jsonRes(res, { message: 'successfully' });
    else
      return jsonRes(res, {
        code: deleteCrResult.reason.body.code,
        message: deleteCrResult.reason.body.message
      });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'delete bucket error'
    });
  }
}
