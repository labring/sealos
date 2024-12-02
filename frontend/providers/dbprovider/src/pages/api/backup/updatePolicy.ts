import { BACKUP_REPO_DEFAULT_KEY } from '@/constants/backup';
import { DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { K8sApiDefault, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { BackupRepoCRItemType } from '@/types/backup';
import { KbPgClusterType } from '@/types/cluster';
import * as k8s from '@kubernetes/client-node';
import { PatchUtils } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export type Props = {
  dbName: string;
  dbType: `${DBTypeEnum}`;
  autoBackup?: KbPgClusterType['spec']['backup'];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { dbName, dbType, autoBackup } = req.body as Props;

  if (!dbName || !dbType) {
    return jsonRes(res, {
      code: 500,
      error: 'params error'
    });
  }

  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const result = await updateBackupPolicyApi({
      dbName,
      dbType,
      autoBackup,
      k8sCustomObjects,
      namespace
    });

    jsonRes(res, { data: result?.body });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export type UpdateBackupPolicyParams = {
  dbName: string;
  dbType: `${DBTypeEnum}`;
  autoBackup?: KbPgClusterType['spec']['backup'];
  k8sCustomObjects: k8s.CustomObjectsApi;
  namespace: string;
};

export async function updateBackupPolicyApi({
  dbName,
  dbType,
  autoBackup,
  k8sCustomObjects,
  namespace
}: UpdateBackupPolicyParams) {
  const group = 'apps.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'clusters';

  // Get cluster backup repository
  const kc = K8sApiDefault();
  const backupRepos = (await kc
    .makeApiClient(k8s.CustomObjectsApi)
    .listClusterCustomObject('dataprotection.kubeblocks.io', 'v1alpha1', 'backuprepos')) as {
    body: {
      items: BackupRepoCRItemType[];
    };
  };

  const defaultRepoItem = backupRepos?.body?.items?.find(
    (item) => item.metadata.annotations[BACKUP_REPO_DEFAULT_KEY] === 'true'
  );

  const backupRepoName = defaultRepoItem?.metadata?.name;

  if (!backupRepoName) {
    throw new Error('Missing backup repository');
  }

  const patch = autoBackup
    ? [
        {
          op: 'replace',
          path: '/spec/backup',
          value: {
            ...autoBackup,
            repoName: backupRepoName
          }
        }
      ]
    : [
        {
          op: 'replace',
          path: '/spec/backup/enabled',
          value: false
        }
      ];

  console.log('backup patch', patch);

  const result = await k8sCustomObjects.patchNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    dbName,
    patch,
    undefined,
    undefined,
    undefined,
    { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
  );

  return result;
}
