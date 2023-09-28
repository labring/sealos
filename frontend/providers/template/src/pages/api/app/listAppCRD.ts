import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace } = req.query as { namespace: string };
    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const customResource: CRDMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: namespace,
      plural: 'apps'
    };

    // 获取指定命名空间中的所有自定义资源
    const customResourceList = await k8sCustomObjects.listNamespacedCustomObject(
      customResource.group,
      customResource.version,
      customResource.namespace,
      customResource.plural
    );

    jsonRes(res, { data: customResourceList, message: 'retrieved successfully' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
