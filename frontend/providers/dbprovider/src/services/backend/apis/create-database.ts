import { createDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { BackupSupportedDBTypeList } from '@/constants/db';
import { updateBackupPolicyApi } from '@/pages/api/backup/updatePolicy';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster, json2ParameterConfig } from '@/utils/json2Yaml';
import { DBEditType, EditType } from '@/types/db';
import { raw2schema } from './get-database';
const schema2Raw = (dbForm: z.Infer<typeof createDatabaseSchemas.body>): DBEditType => {
  return {
    dbType: dbForm.type,
    dbVersion: dbForm.version,
    dbName: dbForm.name,
    replicas: dbForm.resource.replicas,
    cpu: parseFloat(dbForm.resource.cpu),
    memory: parseFloat(dbForm.resource.memory),
    storage: parseFloat(dbForm.resource.storage),
    labels: {},
    terminationPolicy: dbForm.terminationPolicy,
    autoBackup: dbForm.autoBackup,
    parameterConfig: dbForm.parameterConfig
  };
};
export async function createDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    body: z.infer<typeof createDatabaseSchemas.body>;
  }
) {
  const rawDbForm = schema2Raw(request.body);
  const account = json2Account(rawDbForm);
  const cluster = json2CreateCluster(rawDbForm, undefined, {
    storageClassName: process.env.STORAGE_CLASSNAME
  });

  const yamlList = [account, cluster];

  if (['postgresql', 'apecloud-mysql', 'mongodb', 'redis'].includes(rawDbForm.dbType)) {
    const config = json2ParameterConfig(
      rawDbForm.dbName,
      rawDbForm.dbType,
      rawDbForm.dbVersion,
      rawDbForm.parameterConfig
    );

    yamlList.push(config);
  }

  await k8s.applyYamlList(yamlList, 'create');
  const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    k8s.namespace,
    'clusters',
    rawDbForm.dbName
  )) as {
    body: KbPgClusterType;
  };
  const dbUid = body.metadata.uid;

  const updateAccountYaml = json2Account(rawDbForm, dbUid);

  await k8s.applyYamlList([updateAccountYaml], 'replace');

  try {
    if (BackupSupportedDBTypeList.includes(rawDbForm.dbType) && rawDbForm?.autoBackup) {
      const autoBackup = convertBackupFormToSpec({
        autoBackup: rawDbForm?.autoBackup,
        dbType: rawDbForm.dbType
      });

      await updateBackupPolicyApi({
        dbName: rawDbForm.dbName,
        dbType: rawDbForm.dbType,
        autoBackup,
        k8sCustomObjects: k8s.k8sCustomObjects,
        namespace: k8s.namespace
      });
    }
    return raw2schema(adaptDBDetail(body));
  } catch (err: any) {
    // local env will fail to update backup policy
    if (process.env.NODE_ENV === 'production') {
      throw err;
    } else {
      console.log(err);
    }
  }
}
