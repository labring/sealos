import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };

    if (!instanceName) {
      throw new Error('Job name is empty');
    }

    const { namespace, k8sBatch } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const deleteOptions = {
      propagationPolicy: 'Foreground'
    };

    const result = await k8sBatch.deleteNamespacedJob(
      instanceName,
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      deleteOptions.propagationPolicy,
      deleteOptions
    );

    jsonRes(res, { data: 'success' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
