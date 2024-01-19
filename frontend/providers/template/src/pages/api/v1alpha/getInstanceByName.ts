import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { TemplateInstanceType } from '@/types/app';
import { adaptInstanceListItem } from '@/utils/adapt';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const InstanceCRD: CRDMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: namespace,
      plural: 'instances'
    };

    const result = await k8sCustomObjects
      .getNamespacedCustomObject(
        InstanceCRD.group,
        InstanceCRD.version,
        InstanceCRD.namespace,
        InstanceCRD.plural,
        instanceName
      )
      .then((r) => adaptInstanceListItem(r.body as TemplateInstanceType));

    jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
