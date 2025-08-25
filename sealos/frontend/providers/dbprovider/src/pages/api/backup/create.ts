import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { json2ManualBackup } from '@/utils/json2Yaml';
import { DBBackupMethodNameMap, DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';

export type Props = {
  backupName: string;
  dbName: string;
  remark?: string;
  dbType: `${DBTypeEnum}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { backupName, dbName, remark, dbType } = req.body as Props;

  if (!dbName || !backupName || !dbType) {
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
    const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // get backup backupolicies.dataprotection.kubeblocks.io
    // const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
    //   group,
    //   version,
    //   namespace,
    //   plural,
    //   `${dbName}-${DBBackupPolicyNameMap[dbType]}-backup-policy`
    // )) as { body: any };

    const backupPolicyName = `${dbName}-${DBBackupPolicyNameMap[dbType]}-backup-policy`;
    const backupMethod = DBBackupMethodNameMap[dbType];

    if (!backupPolicyName) {
      throw new Error('Cannot find backup policy');
    }

    const backupCr = json2ManualBackup({
      name: backupName,
      backupPolicyName,
      backupMethod,
      remark
    });

    console.info(backupCr);

    // create backup
    await applyYamlList([backupCr], 'create');

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
