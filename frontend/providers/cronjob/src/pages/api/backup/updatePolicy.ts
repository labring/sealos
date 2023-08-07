import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { PatchUtils } from '@kubernetes/client-node';
import { DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';

export type Props = {
  dbName: string;
  dbType: `${DBTypeEnum}`;
  patch: Object;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { dbName, dbType, patch } = req.body as Props;

  if (!dbName || !dbType || !patch) {
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
    await k8sCustomObjects.patchNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      `${dbName}-${DBBackupPolicyNameMap[dbType]}-backup-policy`,
      patch,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
    );

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
