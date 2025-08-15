import { createDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { BackupSupportedDBTypeList } from '@/constants/db';
import { updateBackupPolicyApi } from '@/pages/api/backup/updatePolicy';
import { KbPgClusterType } from '@/types/cluster';
import { convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster, json2ParameterConfig } from '@/utils/json2Yaml';

export async function createDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    body: z.infer<typeof createDatabaseSchemas.body>;
  }
) {
  const account = json2Account(request.body.dbForm);
  const cluster = json2CreateCluster(request.body.dbForm, request.body.backupInfo, {
    storageClassName: process.env.STORAGE_CLASSNAME
  });

  const yamlList = [account, cluster];

  if (['postgresql', 'mysql', 'mongodb', 'redis'].includes(request.body.dbForm.dbType)) {
    const parameterConfig = request.body.dbForm.parameterConfig || {
      walLevel: 'logical',
      sharedPreloadLibraries: 'wal2json'
    };

    const config = json2ParameterConfig(
      request.body.dbForm.dbName,
      request.body.dbForm.dbType,
      request.body.dbForm.dbVersion,
      parameterConfig.walLevel,
      parameterConfig.sharedPreloadLibraries
    );

    yamlList.push(config);
  }

  await k8s.applyYamlList(yamlList, 'create');
  const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    k8s.namespace,
    'clusters',
    request.body.dbForm.dbName
  )) as {
    body: KbPgClusterType;
  };
  const dbUid = body.metadata.uid;

  const updateAccountYaml = json2Account(request.body.dbForm, dbUid);

  await k8s.applyYamlList([updateAccountYaml], 'replace');

  try {
    if (
      BackupSupportedDBTypeList.includes(request.body.dbForm.dbType) &&
      request.body.dbForm?.autoBackup
    ) {
      const autoBackup = convertBackupFormToSpec({
        autoBackup: request.body.dbForm?.autoBackup,
        dbType: request.body.dbForm.dbType
      });

      await updateBackupPolicyApi({
        dbName: request.body.dbForm.dbName,
        dbType: request.body.dbForm.dbType,
        autoBackup,
        k8sCustomObjects: k8s.k8sCustomObjects,
        namespace: k8s.namespace
      });
    }
  } catch (err: any) {
    // local env will fail to update backup policy
    if (process.env.NODE_ENV === 'production') {
      throw err;
    } else {
      console.log(err);
    }
  }
}
