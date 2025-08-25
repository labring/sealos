import { UserSecretData, UserCR } from '@/consts';
import { ApiResp, jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const group = 'objectstorage.sealos.io';
    const version = 'v1';
    const plural = 'objectstorageusers';
    const name = client.namespace.replace('ns-', '');
    const getData = async () => {
      const userRes = await client.k8sCustomObjects.getNamespacedCustomObject(
        group,
        version,
        client.namespace,
        plural,
        name
      );
      const body = userRes.body as UserCR['output'];
      if (body.status)
        return {
          total: body.status.quota,
          used: body.status.size,
          count: body.status.objectsCount
        };
      else return Promise.reject(null);
    };
    const quota = await getData();
    jsonRes(res, { data: { quota } });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get secret error'
    });
  }
}
