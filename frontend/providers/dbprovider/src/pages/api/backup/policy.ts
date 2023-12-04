import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { adaptPolicy } from '@/utils/adapt';
import { DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';

export type Props = {
  dbName: string;
  dbType: `${DBTypeEnum}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { dbName, dbType } = req.query as Props;

  if (!dbName || !dbType) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }

  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backuppolicies';

  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // get backup backupolicies.dataprotection.kubeblocks.io
    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      `${dbName}-${DBBackupPolicyNameMap[dbType]}-backup-policy`
    )) as { body: any };

    jsonRes(res, {
      data: adaptPolicy(body)
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
