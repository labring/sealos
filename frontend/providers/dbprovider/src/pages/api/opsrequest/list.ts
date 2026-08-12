import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KubeBlockOpsRequestType } from '@/types/cluster';
import { DBType, OpsRequestItemType } from '@/types/db';
import { adaptOpsRequest } from '@/utils/adapt';
import { DBNameLabel, DBParameterHistoryLabel } from '@/constants/db';
import { adaptParameterHistory } from '@/utils/parameterHistory';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, label, dbType } = req.query as {
      name: string;
      label: string;
      dbType: DBType;
    };

    const { k8sCore, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    let labelSelector = `app.kubernetes.io/instance=${name}`;
    if (label) {
      labelSelector += `,${label}`;
    }

    const opsrequestsList = (await k8sCustomObjects.listNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'opsrequests',
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    )) as {
      body: {
        items: KubeBlockOpsRequestType[];
      };
    };

    let data: OpsRequestItemType[] = [];
    if (opsrequestsList.body.items.at(0)?.spec.reconfigure) {
      data = opsrequestsList.body.items.map((res) => adaptOpsRequest(res, 'Reconfiguring'));
    } else {
      data = opsrequestsList.body.items.map((res) => adaptOpsRequest(res, 'Switchover'));
    }

    const { body: historyList } = await k8sCore.listNamespacedConfigMap(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${DBNameLabel}=${name},${DBParameterHistoryLabel}=true`
    );
    const parameterHistory = historyList.items
      .map(adaptParameterHistory)
      .filter((item): item is OpsRequestItemType => Boolean(item));

    jsonRes(res, {
      data: [...data, ...parameterHistory].sort(
        (left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime()
      )
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
