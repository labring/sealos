import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const appDeployKey = 'cloud.sealos.io/app-deploy-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sApp, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = await Promise.allSettled([
      k8sApp.listNamespacedDeployment(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        appDeployKey
      ),
      k8sApp.listNamespacedStatefulSet(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        appDeployKey
      )
    ]);

    const apps = response
      .filter((item) => item.status === 'fulfilled')
      .map((item: any) => item?.value?.body?.items)
      .filter((item) => item)
      .flat();

    jsonRes(res, { data: apps });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
