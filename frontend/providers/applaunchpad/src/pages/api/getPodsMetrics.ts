import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

// get App Metrics By DeployName. compute average value
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { podsName } = req.body as { podsName: string[] };

    if (!podsName) {
      throw new Error('podsName is empty');
    }

    const { metricsClient, namespace, kc } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    // get pods metrics
    const metrics = await Promise.allSettled(
      podsName.map((name) => metricsClient.getPodMetrics(namespace, name))
    );
    jsonRes(res, {
      // @ts-ignore
      data: metrics.filter((item) => item.status === 'fulfilled').map((item) => item.value)
    });
  } catch (err: any) {
    // console.log(err, 'get metrics error')
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
