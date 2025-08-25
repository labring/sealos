import { updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, adaptDBListItem } from '@/utils/adapt';
import { dbDetailSchema, dblistItemSchema } from '@/types/schemas/db';
import { DBDetailType, DBListItemType } from '@/types/db';
const raw2schema = (raw: DBDetailType): z.Infer<typeof dblistItemSchema> => {
  const autoBackup = raw.autoBackup;
  const dbEditSchemaFromRaw: z.Infer<typeof dblistItemSchema> = {
    terminationPolicy: raw.terminationPolicy,
    name: raw.dbName,
    type: raw.dbType,
    version: raw.dbVersion,
    resource: {
      cpu: raw.cpu.toString(),
      memory: raw.memory.toString(),
      storage: raw.storage.toString(),
      replicas: raw.replicas
    },
    id: raw.id,
    status: raw.status.value, // 假设 status 是一个对象，其中的 value 是状态字符串
    createTime: raw.createTime,
    totalResource: {
      cpu: raw.totalCpu.toString(),
      memory: raw.totalMemory.toString(),
      storage: raw.totalStorage.toString()
    },
    isDiskSpaceOverflow: raw.isDiskSpaceOverflow,
    source: {
      hasSource: raw.source.hasSource,
      sourceName: raw.source.sourceName,
      sourceType: raw.source.sourceType
    },
    autoBackup
  };

  return dbEditSchemaFromRaw;
};
export async function getDatabaseList(k8s: Awaited<ReturnType<typeof getK8s>>) {
  const { k8sBatch, namespace, k8sCustomObjects, k8sCore, k8sAuth } = k8s;
  const response = (await k8sCustomObjects.listNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    undefined,
    undefined,
    undefined,
    undefined,
    `clusterdefinition.kubeblocks.io/name`
  )) as {
    body: {
      items: KbPgClusterType[];
    };
  };
  const data = (response?.body?.items || []).map(adaptDBDetail).map(raw2schema);
  return data;
}
