import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KubeBlockOpsRequestType } from '@/types/cluster';
import { DBType, OpsRequestItemType } from '@/types/db';
import { adaptOpsRequest } from '@/utils/adapt';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, label, dbType } = req.query as {
      name: string;
      label: string;
      dbType: DBType;
    };

    const { k8sCustomObjects, namespace } = await getK8s({
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

    jsonRes(res, {
      data: data
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
