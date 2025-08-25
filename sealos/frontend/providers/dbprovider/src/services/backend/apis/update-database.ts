import { updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { json2ResourceOps } from '@/utils/json2Yaml';
import { BackupSupportedDBTypeList } from '@/constants/db';
import { updateBackupPolicyApi } from '@/pages/api/backup/updatePolicy';
import { updateTerminationPolicyApi } from '@/pages/api/createDB';
import { raw2schema } from './get-database';

export async function updateDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof updateDatabaseSchemas.pathParams>;
    body: z.infer<typeof updateDatabaseSchemas.body>;
  }
) {
  const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    k8s.namespace,
    'clusters',
    request.params.databaseName
  )) as {
    body: KbPgClusterType;
  };
  const existingDatabase = adaptDBDetail(body);
  const mergedDatabase = {
    ...existingDatabase,
    ...request.body.dbForm
  };

  const opsRequests = [];

  if (
    existingDatabase.cpu !== mergedDatabase.cpu ||
    existingDatabase.memory !== mergedDatabase.memory
  ) {
    const verticalScalingYaml = json2ResourceOps(mergedDatabase, 'VerticalScaling');
    opsRequests.push(verticalScalingYaml);
  }

  if (existingDatabase.replicas !== mergedDatabase.replicas) {
    const horizontalScalingYaml = json2ResourceOps(mergedDatabase, 'HorizontalScaling');
    opsRequests.push(horizontalScalingYaml);
  }

  if (mergedDatabase.storage > existingDatabase.storage) {
    const volumeExpansionYaml = json2ResourceOps(mergedDatabase, 'VolumeExpansion');
    opsRequests.push(volumeExpansionYaml);
  }

  console.log({ opsRequests });

  if (opsRequests.length > 0) {
    await k8s.applyYamlList(opsRequests, 'create');
  }

  if (BackupSupportedDBTypeList.includes(mergedDatabase.dbType) && mergedDatabase?.autoBackup) {
    const autoBackup = convertBackupFormToSpec({
      autoBackup: mergedDatabase?.autoBackup,
      dbType: mergedDatabase.dbType
    });

    await updateBackupPolicyApi({
      dbName: mergedDatabase.dbName,
      dbType: mergedDatabase.dbType,
      autoBackup,
      k8sCustomObjects: k8s.k8sCustomObjects,
      namespace: k8s.namespace
    });

    if (existingDatabase.terminationPolicy !== mergedDatabase.terminationPolicy) {
      await updateTerminationPolicyApi({
        dbName: mergedDatabase.dbName,
        terminationPolicy: mergedDatabase.terminationPolicy,
        k8sCustomObjects: k8s.k8sCustomObjects,
        namespace: k8s.namespace
      });
    }
  }
  const { body: body2 } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    k8s.namespace,
    'clusters',
    request.params.databaseName
  )) as {
    body: KbPgClusterType;
  };
  return {
    data: raw2schema(adaptDBDetail(body2))
  };
}
