import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { assertPodExecPermission } from '@/services/backend/podExecPermission';
import { ResponseCode } from '@/types/response';
import { KubeFileSystem } from '@/utils/kubeFileSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { kc, namespace, k8sExec } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { containerName, from, to, podName } = req.body as {
      containerName: string;
      podName: string;
      from: string;
      to: string;
    };

    await assertPodExecPermission({ kc, namespace, podName });
    const kubefs = new KubeFileSystem(k8sExec);
    const data = await kubefs.mv({ namespace, podName, containerName, from, to });
    jsonRes(res, { data });
  } catch (err: any) {
    jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
