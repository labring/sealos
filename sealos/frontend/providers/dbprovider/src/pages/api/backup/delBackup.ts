import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export type Props = {
  backupName: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { backupName } = req.query as Props;

  if (!backupName) {
    jsonRes(res, {
      code: 500,
      error: 'backupName is empty'
    });
    return;
  }

  try {
    const result = await delBackupByName({
      backupName,
      req
    });
    jsonRes(res, { data: result?.body });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function delBackupByName({ backupName, req }: Props & { req: NextApiRequest }) {
  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backups';

  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  return await k8sCustomObjects.deleteNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    backupName
  );
}
