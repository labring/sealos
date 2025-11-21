import { getDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { CloudMigraionLabel } from '@/constants/db';
import { adaptDBDetail } from '@/utils/adapt';
import { KbPgClusterType } from '@/types/cluster';

export async function deleteDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof getDatabaseSchemas.pathParams>;
  }
) {
  const name = request.params.databaseName;
  const { k8sBatch, namespace, k8sCustomObjects, k8sCore, k8sAuth } = k8s;

  try {
    // Get cluster info before deletion for configuration cleanup
    let dbDetail;
    try {
      const { body } = await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        name
      );
      dbDetail = adaptDBDetail(body as KbPgClusterType);
    } catch (error) {}

    // 1. Delete migration jobs
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

    await Promise.all(
      jobsToDelete.map(async (job) => {
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
              if (error?.response?.statusCode !== 404) {
              }
            });
        }
      })
    );

    // 2. Delete migration tasks
    try {
      const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
        'datamigration.apecloud.io',
        'v1alpha1',
        namespace,
        'migrationtasks',
        undefined,
        undefined,
        undefined,
        undefined,
        `${CloudMigraionLabel}=${name}`
      )) as { body: { items: any[] } };
      const migrates = body?.items || [];

      await Promise.all(
        migrates.map(async (migrate) => {
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
                if (error?.response?.statusCode !== 404) {
                }
              });
          }
        })
      );
    } catch (error) {}

    // 3. Delete export service
    await k8sCore.deleteNamespacedService(`${name}-export`, namespace).catch((err) => {
      if (err?.response?.statusCode !== 404) {
      }
    });

    // 4. Delete connection credential secret
    await k8sCore.deleteNamespacedSecret(`${name}-conn-credential`, namespace).catch((err) => {
      if (err?.response?.statusCode !== 404) {
      }
    });

    // 5. Delete RBAC resources
    await Promise.all([
      k8sAuth.deleteNamespacedRole(name, namespace).catch((err) => {
        if (err?.response?.statusCode !== 404) {
          throw err;
        }
      }),
      k8sAuth.deleteNamespacedRoleBinding(name, namespace).catch((err) => {
        if (err?.response?.statusCode !== 404) {
          throw err;
        }
      }),
      k8sCore.deleteNamespacedServiceAccount(name, namespace).catch((err) => {
        if (err?.response?.statusCode !== 404) {
          throw err;
        }
      })
    ]);

    // 6. Delete KubeBlocks configuration
    if (dbDetail) {
      const configName = `${name}-${
        dbDetail.dbType === 'apecloud-mysql' ? 'mysql' : dbDetail.dbType
      }`;

      await k8sCustomObjects
        .deleteNamespacedCustomObject(
          'apps.kubeblocks.io',
          'v1alpha1',
          namespace,
          'configurations',
          configName
        )
        .catch((err) => {
          if (err?.response?.statusCode !== 404) {
          }
        });
    }

    // 7. Delete any remaining ConfigMaps
    try {
      const { body: configMaps } = await k8sCore.listNamespacedConfigMap(
        namespace,
        undefined,
        undefined,
        undefined,
        `app.kubernetes.io/instance=${name}`
      );

      await Promise.all(
        configMaps.items.map(async (cm) => {
          if (cm.metadata?.name) {
            await k8sCore.deleteNamespacedConfigMap(cm.metadata.name, namespace).catch((err) => {
              if (err?.response?.statusCode !== 404) {
                console.error(`Error deleting configmap:`, err);
              }
            });
          }
        })
      );
    } catch (error) {}

    // 8. Finally delete the cluster (this will also trigger PVC deletion based on terminationPolicy)
    const result = await k8sCustomObjects.deleteNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      name
    );
    return result;
  } catch (error) {
    throw error;
  }
}
