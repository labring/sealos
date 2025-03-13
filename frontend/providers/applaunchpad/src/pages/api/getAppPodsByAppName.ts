import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession,getAdminAuthorization } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import dayjs from 'dayjs';
import { adaptPod } from '@/utils/adapt';

// get App Metrics By DeployName. compute average value
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const reqNamespace = req.query.namespace as string;
  try {
    const { name } = req.query;

    if (!name) {
      throw new Error('Name is empty');
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await getAdminAuthorization(req.headers)
    });

    // get pods
    const {
      body: { items: pods }
    } = await k8sCore.listNamespacedPod(
      reqNamespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${name}`
    );

    jsonRes(res, {
      data: pods.map((item) => adaptPod(item))
    });
  } catch (err: any) {
    // console.log(err, 'get metrics error')
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
