import { createDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { BackupSupportedDBTypeList } from '@/constants/db';
import { updateBackupPolicyApi } from '@/pages/api/backup/updatePolicy';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster } from '@/utils/json2Yaml';
import { DBEditType } from '@/types/db';
import { raw2schema } from './get-database';
const schema2Raw = (raw: z.Infer<typeof createDatabaseSchemas.body>): DBEditType => {
  return {
    dbType: raw.type,
    dbVersion: raw.version,
    dbName: raw.name,
    replicas: raw.resource.replicas,
    cpu: raw.resource.cpu,
    memory: raw.resource.memory,
    storage: raw.resource.storage,
    labels: {},
    terminationPolicy: raw.terminationPolicy,
    autoBackup: {
      start: true,
      type: 'day',
      week: [],
      hour: '12',
      minute: '00',
      saveTime: 100,
      saveType: 'd'
    }
  };
};
export async function createDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    body: z.infer<typeof createDatabaseSchemas.body>;
  }
) {
  const rawData = schema2Raw(request.body);
  const account = json2Account(rawData);
  const cluster = json2CreateCluster(rawData, undefined, {
    storageClassName: process.env.STORAGE_CLASSNAME
  });

  await k8s.applyYamlList([account, cluster], 'create');
  const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    k8s.namespace,
    'clusters',
    rawData.dbName
  )) as {
    body: KbPgClusterType;
  };
  const dbUid = body.metadata.uid;

  const updateAccountYaml = json2Account(rawData, dbUid);

  await k8s.applyYamlList([updateAccountYaml], 'replace');

  try {
    if (BackupSupportedDBTypeList.includes(rawData.dbType)) {
      const autoBackup = convertBackupFormToSpec({
        autoBackup: rawData.autoBackup,
        dbType: rawData.dbType
      });

      await updateBackupPolicyApi({
        dbName: rawData.dbName,
        dbType: rawData.dbType,
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
