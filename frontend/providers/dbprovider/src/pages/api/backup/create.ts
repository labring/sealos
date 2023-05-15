import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { json2BackupPvc, json2Backup } from '@/utils/json2Yaml';
import type { BackupPolicyType } from '@/types/backup';
import { PatchUtils } from '@kubernetes/client-node';
import { DBTypeEnum, DBBackupPolicyNameMap } from '@/constants/db';
import dayjs from 'dayjs';
import { delay } from '@/utils/tools';

export type Props = {
  dbName: string;
  dbType: `${DBTypeEnum}`;
  storage: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { dbName, dbType, storage = 1 } = req.body as Props;

  if (!dbName) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }

  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backuppolicies';
  const backupPolicyName = `${dbName}-${DBBackupPolicyNameMap[dbType]}-backup-policy`;
  const crName = `${dbName}${dayjs().format('YYYYMMDDHHmmss')}`;

  const pvc = json2BackupPvc({
    crName,
    dbName,
    storage
  });
  const backup = json2Backup({
    crName,
    dbName,
    backupPolicyName
  });

  try {
    const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // create backup pvc
    await applyYamlList([pvc], 'create');

    // update backupPolicy file
    const { body: bp } = (await k8sCustomObjects.getNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      backupPolicyName
    )) as { body: BackupPolicyType };
    if (!bp.spec?.datafile?.persistentVolumeClaim) {
      throw new Error('get backupPolicy error');
    }
    const jsonPatch = [
      {
        op: 'replace',
        path: '/spec/datafile/persistentVolumeClaim/initCapacity',
        value: `${storage}Gi`
      },
      {
        op: 'replace',
        path: '/spec/datafile/persistentVolumeClaim/name',
        value: `${crName}-pvc`
      }
    ];
    await k8sCustomObjects.patchNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      backupPolicyName,
      jsonPatch,
      undefined,
      undefined,
      undefined,
      {
        headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH }
      }
    );

    await delay(100);

    // create backup
    await applyYamlList([backup], 'create');

    jsonRes(res, {
      data: ''
    });
  } catch (err: any) {
    try {
      // delete cr
      const { delYamlList } = await getK8s({
        kubeconfig: await authSession(req)
      });
      await delYamlList([pvc, backup]);
    } catch (error) {}

    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
