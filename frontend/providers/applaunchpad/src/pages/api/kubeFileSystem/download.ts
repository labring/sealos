import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode } from '@/types/response';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import { PassThrough } from 'stream';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace, k8sExec } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { containerName, path, podName } = req.body as {
      containerName: string;
      podName: string;
      path: string;
    };

    const kubefs = new KubeFileSystem(k8sExec);
    const stdout = new PassThrough();
    kubefs.download({ namespace, podName, containerName, path, stdout });
    stdout.pipe(res);
  } catch (err: any) {
    jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
