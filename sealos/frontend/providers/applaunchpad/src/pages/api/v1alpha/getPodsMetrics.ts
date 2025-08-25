import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetPodMetrics, GetPodMetricsProps } from '../getPodsMetrics';

// get App Metrics By DeployName. compute average value
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
    console.log(err, 'get metrics error');
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
