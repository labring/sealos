import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { name } = req.query as { name: string };
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = (await k8sCustomObjects.getNamespacedCustomObject(
      'license.sealos.io',
      'v1',
      namespace,
      'licenses',
      name
    )) as {
      body: any;
    };

    jsonRes(res, {
      data: response.body
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
