import { authSessionBase64 } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { PauseApp, StartApp } from '../v1alpha/updateReplica';

type UpdateReplicaParams = {
  appName: string;
  replica: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName, replica } = req.body as UpdateReplicaParams;

    if (!appName) {
      throw new Error('appName is empty');
    }

    const kubeconfig = await authSessionBase64(req.headers);
    const k8sContext = await getK8s({ kubeconfig });

    let result;

    if (Number(replica) === 0) {
      result = await PauseApp({ appName, replica, k8sContext });
    } else {
      result = await StartApp({ appName, replica, k8sContext });
    }

    jsonRes(res, { data: 'update replica success' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
