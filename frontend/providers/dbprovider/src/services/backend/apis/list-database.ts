import { updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, adaptDBListItem } from '@/utils/adapt';
import { dbDetailSchema, dblistItemSchema } from '@/types/schemas/db';
import {
  CPUResourceEnum,
  DBDetailType,
  MemoryResourceEnum,
  ReplicasResourceEnum
} from '@/types/db';
const raw2schema = (raw: DBDetailType): z.Infer<typeof dblistItemSchema> => {
  const autoBackup = raw.autoBackup;
  const dbEditSchemaFromRaw: z.Infer<typeof dblistItemSchema> = {
    terminationPolicy: raw.terminationPolicy,
    name: raw.dbName,
    type: raw.dbType,
    version: raw.dbVersion,
    resource: {
      cpu: raw.cpu as CPUResourceEnum,
      memory: raw.memory as MemoryResourceEnum,
      storage: raw.storage as number,
      replicas: raw.replicas as ReplicasResourceEnum
    },
    id: raw.id,
    status: raw.status.value,
    createTime: raw.createTime,
    totalResource: {
      cpu: raw.totalCpu as CPUResourceEnum,
      memory: raw.totalMemory as MemoryResourceEnum,
      storage: raw.totalStorage as number
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
