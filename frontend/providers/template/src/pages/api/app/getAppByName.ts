import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { templateDeployKey } from '@/constants/keys';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };

    const { k8sApp, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const labelSelectorKey = `${templateDeployKey}=${instanceName}`;

    const response = await Promise.allSettled([
      k8sApp.listNamespacedDeployment(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelectorKey
      ),
      k8sApp.listNamespacedStatefulSet(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelectorKey
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
