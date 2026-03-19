import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { BackupClusterUidLabel } from '@/constants/db';

export type Props = {
  dbUid: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { dbUid } = req.query as Props;

  if (!dbUid || !UUID_REGEX.test(dbUid)) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }

  try {
    const data = await getBackupListByDBUid({ dbUid, req });
    jsonRes(res, {
      data
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function getBackupListByDBUid({ dbUid, req }: Props & { req: NextApiRequest }) {
  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backups';

  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    undefined,
    undefined,
    undefined,
    undefined,
    `${BackupClusterUidLabel}=${dbUid}`
  )) as { body: { items: any[] } };

  return body?.items || [];
}
