import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KubeFileSystem } from '@/utils/kubeFileSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace, k8sExec } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const kubefs = new KubeFileSystem(k8sExec);
    const { containerName, path, podName } = req.body as {
      containerName: string;
      podName: string;
      path: string;
    };

    const data = await kubefs.rm({ namespace, podName, containerName, path });
    jsonRes(res, { data });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
