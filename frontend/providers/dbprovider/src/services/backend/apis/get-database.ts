import { updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail } from '@/utils/adapt';
import { dbDetailSchema } from '@/types/schemas/db';
import {
  CPUResourceEnum,
  DBDetailType,
  MemoryResourceEnum,
  ReplicasResourceEnum
} from '@/types/db';
export const raw2schema = (raw: DBDetailType): z.Infer<typeof dbDetailSchema> => {
  const dbEditSchemaFromRaw: z.Infer<typeof dbDetailSchema> = {
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
    autoBackup: raw.autoBackup
  };

  return dbEditSchemaFromRaw;
};
export async function getDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof updateDatabaseSchemas.pathParams>;
  }
) {
  const { k8sBatch, namespace, k8sCustomObjects, k8sCore, k8sAuth } = k8s;
  const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    request.params.databaseName
  )) as {
    body: KbPgClusterType;
  };
  return raw2schema(adaptDBDetail(body));
}
