import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail } from '@/utils/adapt';
import { defaultDBDetail } from '@/constants/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, mock } = req.query as { name: string; mock?: string };
    if (!name) {
      throw new Error('name is empty');
    }

    if (mock === 'true') {
      return jsonRes(res, {
        data: defaultDBDetail
      });
    }

    const body = await getCluster(req, name);

    jsonRes(res, {
      data: adaptDBDetail(body)
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function getCluster(req: NextApiRequest, name: string) {
  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    name
  )) as {
    body: KbPgClusterType;
  };

  return body;
}
