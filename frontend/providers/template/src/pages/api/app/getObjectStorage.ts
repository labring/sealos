import { templateDeployKey } from '@/constants/keys';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { ObjectStorageCR } from '@/types/objectStorage';
import { adaptObjectStorageItem } from '@/utils/adapt';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    const { namespace, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    const labelSelectorKey = `${templateDeployKey}=${instanceName}`;

    const result = (await k8sCustomObjects.listNamespacedCustomObject(
      'objectstorage.sealos.io',
      'v1',
      namespace,
      'objectstoragebuckets',
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelectorKey
    )) as {
      body: {
        items: ObjectStorageCR[];
      };
    };

    const data = result?.body?.items?.map(adaptObjectStorageItem);

    jsonRes(res, { data });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
