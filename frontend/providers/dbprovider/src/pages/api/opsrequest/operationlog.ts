import { crLabelKey, DBNameLabel } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KubeBlockOpsRequestType } from '@/types/cluster';
import { DBType, OpsRequestItemType } from '@/types/db';
import { adaptOperationLog } from '@/utils/adapt';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, dbType } = req.query as {
      name: string;
      dbType: DBType;
    };

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const labelSelectors = [`${DBNameLabel}=${name}`, `${crLabelKey}=${name}`] as const;

    const opsrequestsLists = (await Promise.all(
      labelSelectors.map((labelSelector) =>
        k8sCustomObjects.listNamespacedCustomObject(
          'apps.kubeblocks.io',
          'v1alpha1',
          namespace,
          'opsrequests',
          undefined,
          undefined,
          undefined,
          undefined,
          labelSelector
        )
      )
    )) as Array<{
      body: {
        items: KubeBlockOpsRequestType[];
      };
    }>;

    const mergedOpsrequests = Array.from(
      opsrequestsLists
        .flatMap((opsrequestsList) => opsrequestsList.body.items)
        .reduce<Map<string, KubeBlockOpsRequestType>>((result, item) => {
          const uid = item.metadata?.uid;

          if (uid && !result.has(uid)) {
            result.set(uid, item);
          }

          return result;
        }, new Map())
        .values()
    ).sort((left, right) => {
      const leftTime = new Date(left.metadata?.creationTimestamp || 0).getTime();
      const rightTime = new Date(right.metadata?.creationTimestamp || 0).getTime();

      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return (left.metadata?.uid || '').localeCompare(right.metadata?.uid || '');
    });

    const opsrequests = mergedOpsrequests
      .map((item) => adaptOperationLog(item, dbType))
      .filter((item) => item.configurations?.length) as OpsRequestItemType[];

    jsonRes(res, {
      data: opsrequests
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
