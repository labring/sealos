import { getDatabaseSchemas, updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { delMigrateByName } from '@/pages/api/migrate/delete';
import { GetJobByName, DeleteJobByName } from '@/pages/api/migrate/delJobByName';
import { CloudMigraionLabel } from '@/constants/db';
import { getMigrateList } from '@/pages/api/migrate/list';
export async function deleteDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof getDatabaseSchemas.pathParams>;
  }
) {
  const name = request.params.databaseName;
  // get job and delete
  const { k8sBatch, namespace, k8sCustomObjects, k8sCore, k8sAuth } = k8s;
  const jobsToDelete = (
    await k8sBatch.listNamespacedJob(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${CloudMigraionLabel}=${name}`
    )
  ).body.items;

  for (const job of jobsToDelete) {
    if (job?.metadata?.name) {
      await k8sBatch
        .deleteNamespacedJob(
          job.metadata.name,
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          'Background'
        )
        .catch((error) => {
          console.error(`Error deleting job`, error);
        });
    }
  }

  // get migrates and delete
  /* Retrieve migrations */
  const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
    'datamigration.apecloud.io',
    'v1alpha1',
    namespace,
    'migrationtasks',
    undefined, //pretty
    undefined, //allowWatchBookmarks
    undefined, //_continue
    undefined, //fieldSelector
    `${CloudMigraionLabel}=${name}` //labelSelector
  )) as { body: { items: any[] } };
  const migrates = body?.items || [];

  /* Delete each migrationTask custom object */
  for (const migrate of migrates) {
    if (migrate?.metadata?.name) {
      await k8sCustomObjects
        .deleteNamespacedCustomObject(
          'datamigration.apecloud.io',
          'v1alpha1',
          namespace,
          'migrationtasks',
          migrate.metadata.name
        )
        .catch((error) => {
          console.error('Failed to delete migrationTask', error);
        });
    }
  }

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
}
