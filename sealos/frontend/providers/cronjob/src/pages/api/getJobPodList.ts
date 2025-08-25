import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { jobNames } = req.body as {
      jobNames: string[];
    };
    const labelSelector = jobNames.join(',');
    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `job-name in (${labelSelector})`
    );

    return jsonRes(res, {
      data: response.body
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
