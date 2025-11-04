import { updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail } from '@/utils/adapt';
import { dbDetailSchema, ClusterObjectSchema } from '@/types/schemas/db';
import {
  CPUResourceEnum,
  DBDetailType,
  MemoryResourceEnum,
  ReplicasResourceEnum,
  DBType
} from '@/types/db';
import { cpuFormatToM, memoryFormatToMi, storageFormatToNum } from '@/utils/tools';

// connection secret names
const getSecretNames = (dbName: string, dbType: DBType): string[] => {
  const secretMap: Record<DBType, string[]> = {
    mongodb: [`${dbName}-mongodb-account-root`, `${dbName}-mongo-conn-credential`],
    redis: [`${dbName}-redis-account-default`, `${dbName}-redis-conn-credential`],
    kafka: [`${dbName}-broker-account-admin`, `${dbName}-conn-credential`]
  } as any;
  return secretMap[dbType] || [`${dbName}-conn-credential`];
};
//database transform to schema
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
      ? {
          ...raw.autoBackup,
          week: raw.autoBackup.week as (
            | 'monday'
            | 'tuesday'
            | 'wednesday'
            | 'thursday'
            | 'friday'
            | 'saturday'
            | 'sunday'
          )[],
          saveType: raw.autoBackup.saveType as 'days' | 'weeks' | 'months' | 'hours'
        }
      : undefined
  };

  return dbEditSchemaFromRaw;
};

//get database details
export async function getDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof updateDatabaseSchemas.pathParams>;
  }
): Promise<z.infer<typeof ClusterObjectSchema>> {
  const { namespace, k8sCustomObjects, k8sCore } = k8s;
  const dbName = request.params.databaseName;

  const { body: cluster } = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    dbName
  )) as { body: KbPgClusterType };

  //get database type
  const rawDbType =
    cluster.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] || 'postgresql';
  const dbType = ((rawDbType as string) === 'mysql' ? 'apecloud-mysql' : rawDbType) as DBType;

  // Fetch connection - try new naming format first, fallback to old
  const getConnection = async () => {
    const secretNames = getSecretNames(dbName, dbType);
    for (const secretName of secretNames) {
      try {
        const secret = await k8sCore.readNamespacedSecret(secretName, namespace);
        if (!secret.body?.data) continue;

        const decode = (key: string) =>
          secret.body.data?.[key]
            ? Buffer.from(secret.body.data[key], 'base64').toString('utf-8').trim()
            : null;

        const [endpoint, host, port, username, password] = [
          decode('endpoint'),
          decode('host'),
          decode('port'),
          decode('username'),
          decode('password')
        ];

        let connectionString = null;
        if (host && port && username && password) {
          const protocols: Record<string, string> = {
            kafka: endpoint || `${host}:${port}`,
            milvus: endpoint || `${host}:${port}`,
            mongodb: `mongodb://${username}:${password}@${host}:${port}`,
            postgresql: `postgresql://${username}:${password}@${host}:${port}`,
            'apecloud-mysql': `mysql://${username}:${password}@${host}:${port}`,
            redis: `redis://${username}:${password}@${host}:${port}`
          };
          connectionString = protocols[dbType] || null;
        }

        return { endpoint, host, port, username, password, connectionString };
      } catch {}
    }
    return null;
  };

  // Fetch public connection
  const getPublicConnection = async () => {
    try {
      const service = await k8sCore.readNamespacedService(`${dbName}-export`, namespace);
      const nodePort = service.body?.spec?.ports?.[0]?.nodePort;
      return nodePort ? { port: nodePort, connectionString: null } : null;
    } catch {
      return null;
    }
  };

  // Fetch pods
  const getPods = async () => {
    try {
      const { body } = await k8sCore.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app.kubernetes.io/instance=${dbName}`
      );

      return body.items.map((pod) => {
        let upTime = null;
        if (pod.status?.startTime) {
          const seconds = Math.floor(
            (Date.now() - new Date(pod.status.startTime).getTime()) / 1000
          );
          const d = Math.floor(seconds / 86400);
          const h = Math.floor((seconds % 86400) / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          upTime = d > 0 ? `${d}d${h}h` : h > 0 ? `${h}h${m}m` : `${m}m`;
        }

        return {
          name: pod.metadata?.name || null,
          status: pod.status?.phase || null,
          upTime,
          containers:
            pod.status?.containerStatuses?.map((c) => ({
              name: c.name,
              ready: c.ready,
              state: c.state,
              restartCount: c.restartCount
            })) || null
        };
      });
    } catch {
      return [];
    }
  };

  // Extract components
  const components = (cluster.spec?.componentSpecs || []).map((spec) => {
    const cpu = cpuFormatToM(spec.resources?.limits?.cpu || '0') / 1000;
    const memory = memoryFormatToMi(spec.resources?.limits?.memory || '0') / 1024;
    const storage = storageFormatToNum(
      spec.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage || '0'
    );

    return {
      name: spec.name,
      status: (cluster.status?.components as any)?.[spec.name]?.phase || 'unknown',
      resource: { cpu, memory, storage, replicas: spec.replicas || 0 }
    };
  });

  // Calculate total resources
  const totalReplicas = components.reduce((sum, c) => sum + (c.resource?.replicas || 0), 0);
  const totalCpu = components.reduce(
    (sum, c) => sum + (c.resource?.cpu || 0) * (c.resource?.replicas || 0),
    0
  );
  const totalMemory = components.reduce(
    (sum, c) => sum + (c.resource?.memory || 0) * (c.resource?.replicas || 0),
    0
  );
  const totalStorage = components.reduce(
    (sum, c) => sum + (c.resource?.storage || 0) * (c.resource?.replicas || 0),
    0
  );

  const [privateConnection, publicConnection, pods] = await Promise.all([
    getConnection(),
    getPublicConnection(),
    getPods()
  ]);

  return {
    name: cluster.metadata?.name || dbName,
    kind: cluster.kind || 'Cluster',
    type: dbType,
    version: cluster.metadata?.labels?.['clusterversion.kubeblocks.io/name'] || null,
    operationalStatus: { createdAt: cluster.metadata?.creationTimestamp || null },
    status: cluster.status?.phase || null,
    resource: {
      cpu: totalReplicas ? totalCpu / totalReplicas : null,
      memory: totalReplicas ? totalMemory / totalReplicas : null,
      storage: totalReplicas ? totalStorage / totalReplicas : null,
      replicas: totalReplicas || null
    },
    components,
    connection: { privateConnection, publicConnection },
    backup: cluster.spec?.backup || null,
    pods
  };
}
