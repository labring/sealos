import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { LicenseCR } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = (await k8sCustomObjects.listNamespacedCustomObject({
      group: 'license.sealos.io',
      version: 'v1',
      namespace,
      plural: 'licenses'
    })) as {
      items: LicenseCR[];
    };

    const result = response.items.filter((item) => item.status.phase === 'Active');

    jsonRes(res, {
      data: result
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
