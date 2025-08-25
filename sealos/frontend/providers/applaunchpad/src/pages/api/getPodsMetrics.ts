import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export type GetPodMetricsProps = {
  podsName: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { podsName } = req.body as GetPodMetricsProps;

    if (!podsName) {
      throw new Error('podsName is empty');
    }

    jsonRes(res, {
      data: await GetPodMetrics({ req, podsName })
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export const GetPodMetrics = async ({
  req,
  podsName
}: GetPodMetricsProps & { req: NextApiRequest }) => {
  const { metricsClient, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const metrics = await Promise.allSettled(
    podsName.map((name) => metricsClient.getPodMetrics(namespace, name))
  );

  // @ts-ignore
  return metrics.filter((item) => item.status === 'fulfilled').map((item) => item.value);
};
