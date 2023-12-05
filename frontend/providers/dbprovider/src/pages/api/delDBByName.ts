import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { getBackups } from './backup/getBackupList';
import { delBackupByName } from './backup/delBackup';
import { getMigrateList } from './migrate/list';
import { delMigrateByName } from './migrate/delete';
import { DeleteJobByName, GetJobByName } from './migrate/delJobByName';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as { name: string };

    if (!name) {
      throw new Error('deploy name is empty');
    }

    const { namespace, k8sCustomObjects, k8sAuth, k8sCore } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // get job and delete
    const jobs = await GetJobByName({ name: name, req });
    await Promise.all(
      jobs.map((item) => item?.metadata?.name && DeleteJobByName({ name: item.metadata.name, req }))
    ).catch((error) => {
      console.log(error);
    });

    // get migrates and delete
    try {
      const migrates = await getMigrateList({ migrateName: name, req });
      await Promise.all(
        migrates.map((item) => delMigrateByName({ migrateName: item.metadata.name, req }))
      );
    } catch (error) {
      console.log(error);
    }

    // get backup and delete
    const backups = await getBackups({ dbName: name, req });
    await Promise.all(
      backups.map((item) => delBackupByName({ backupName: item.metadata.name, req }))
    );

    // del service
    await k8sCore.deleteNamespacedService(`${name}-export`, namespace).catch((err) => {
      if (err?.body?.code !== 404) {
        throw new Error(err?.message || 'Delete DB Service Export Error');
      }
    });

    // del role
    await Promise.all([
      k8sAuth.deleteNamespacedRole(name, namespace),
      k8sAuth.deleteNamespacedRoleBinding(name, namespace),
      k8sCore.deleteNamespacedServiceAccount(name, namespace)
    ]).catch((err) => console.log(err, 'delete role err'));

    // delete cluster
    const result = await k8sCustomObjects.deleteNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      name
    );

    jsonRes(res, { data: result?.body });
  } catch (err: any) {
    console.log(err, 'delete db by name err');
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
