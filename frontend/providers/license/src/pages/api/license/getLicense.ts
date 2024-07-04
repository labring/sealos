import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = (await k8sCustomObjects.listNamespacedCustomObject(
      'license.sealos.io',
      'v1',
      namespace,
      'licenses',
      undefined,
      undefined,
      undefined,
      undefined
    )) as {
      body: {
        items: [];
      };
    };

    jsonRes(res, {
      data: response.body.items
    });
  } catch (err) {
    console.log(err, 'getlicense----');
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
