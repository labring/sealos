import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KubeBlockOpsRequestType } from '@/types/cluster';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, label } = req.query as {
      name: string;
      label: string;
    };

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    let labelSelector = `app.kubernetes.io/instance=${name}`;
    if (label) {
      labelSelector += `,${label}`;
    }

    const data = (await k8sCustomObjects.listNamespacedCustomObject(
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

    jsonRes(res, {
      data: data.body.items
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
