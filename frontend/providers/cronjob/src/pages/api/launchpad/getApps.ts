import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { adaptAppListItem } from '@/utils/adapt';

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
      .map((item: any, index) => {
        const items = item?.value?.body?.items || [];
        return items.map((app: any) => ({
          ...app,
          kind: index === 0 ? 'Deployment' : 'StatefulSet'
        }));
      })
      .filter((item) => item)
      .flat();

    jsonRes(res, { data: apps.map(adaptAppListItem) });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
