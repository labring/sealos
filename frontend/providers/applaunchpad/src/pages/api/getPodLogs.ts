import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

// get App Metrics By DeployName. compute average value
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const {
      appName,
      podName,
      pageNum = 1,
      pageSize
    } = req.query as {
      appName: string;
      podName: string;
      pageNum: string;
      pageSize: string;
    };

    if (!podName) {
      throw new Error('podName is empty');
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // get pods
    const { body: data } = await k8sCore.readNamespacedPodLog(podName, namespace, appName);

    jsonRes(res, {
      data
    });
  } catch (err: any) {
    // console.log(err, 'get metrics error')
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
