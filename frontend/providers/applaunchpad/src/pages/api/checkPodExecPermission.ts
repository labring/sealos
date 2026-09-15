import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode } from '@/types/response';
import { assertPodExecPermission } from '@/services/backend/podExecPermission';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { podName } = req.query as { podName: string };
    if (!podName) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        message: 'podName is empty'
      });
    }

    const { kc, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    await assertPodExecPermission({ kc, namespace, podName });

    jsonRes(res, { data: { allowed: true } });
  } catch (err: any) {
    jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
