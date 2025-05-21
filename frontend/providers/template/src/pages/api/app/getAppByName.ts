import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { templateDeployKey } from '@/constants/keys';
import { adaptAppListItem } from '@/utils/adapt';
import { MockAppList } from '@/constants/mock';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { instanceName, mock = 'false' } = req.query as { instanceName: string; mock: string };

    const { k8sApp, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    if (mock === 'true') {
      return jsonRes(res, { data: MockAppList });
    }

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

    const data = apps.map(adaptAppListItem);

    jsonRes(res, { data });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
