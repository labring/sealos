import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KBBackupNameLabel } from '@/constants/db';

// get App Metrics By DeployName. compute average value
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query;

    if (!name) {
      throw new Error('Name is empty');
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // get pods
    const {
      body: { items: pods }
    } = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/instance=${name},!${KBBackupNameLabel}`
    );

    jsonRes(res, {
      data: pods
    });
  } catch (err: any) {
    // console.log(err, 'get metrics error')
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
