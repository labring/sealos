import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import { ResponseCode } from '@/types/response';

export type Props = {
  backupName: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { backupName } = req.query as Props;

  if (!backupName) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      message: 'backupName is required'
    });
  }

  const result = await delBackupByName({
    backupName,
    req
  });

  jsonRes(res, { data: result?.body, message: 'Backup deleted successfully' });
}

export default withErrorHandler(handler);

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
