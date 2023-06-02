import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response: any = await k8sCustomObjects.listNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      undefined,
      undefined,
      undefined,
      undefined,
      `clusterdefinition.kubeblocks.io/name`
    );

    jsonRes(res, { data: response?.body?.items });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
