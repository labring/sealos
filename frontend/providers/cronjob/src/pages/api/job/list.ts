import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { cronJobName } = req.query as { cronJobName: string };
    const { namespace, k8sBatch } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = await k8sBatch.listNamespacedJob(namespace);
    const jobs = response.body.items.filter(
      (job) => job.metadata?.name && job.metadata.name.startsWith(`${cronJobName}-`)
    );

    jsonRes(res, { data: jobs });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
