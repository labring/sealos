import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

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

    // 删除指定名称的自定义对象
    await k8sCustomObjects.deleteNamespacedCustomObject(
      InstanceCRD.group,
      InstanceCRD.version,
      InstanceCRD.namespace,
      InstanceCRD.plural,
      instanceName
    );

    jsonRes(res, { message: `Custom object "${instanceName}" deleted successfully` });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
