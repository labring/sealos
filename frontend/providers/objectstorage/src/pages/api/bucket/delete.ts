import { ApiResp, jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import { appLanuchPadClient } from '@/services/request';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const client = await initK8s({ req });
  const { bucketName } = req.body as { bucketName?: string };

  if (!bucketName) {
    return jsonRes(res, {
      code: 400,
      message: 'bucketName is invalid'
    });
  }

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

  if (deleteCrResult.status === 'fulfilled') {
    return jsonRes(res, { code: 200, message: 'successfully' });
  } else {
    throw (
      deleteCrResult.reason?.body || deleteCrResult.reason || new Error('Failed to delete bucket')
    );
  }
}

export default withErrorHandler(handler);
