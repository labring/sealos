import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { deleteBackupAndCleanupRepoPVC } from '@/services/backend/backupCleanup';
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
  const { k8sCore, k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  return await deleteBackupAndCleanupRepoPVC({
    backupName,
    k8sCore,
    k8sCustomObjects,
    namespace
  });
}
