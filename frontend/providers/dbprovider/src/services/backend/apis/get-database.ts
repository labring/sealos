import { updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { dbDetailSchema, ClusterObjectSchema } from '@/types/schemas/db';
import {
  CPUResourceEnum,
  DBDetailType,
  MemoryResourceEnum,
  ReplicasResourceEnum,
  DBType
} from '@/types/db';
import { cpuFormatToM, memoryFormatToMi, storageFormatToNum } from '@/utils/tools';

const CONSTANTS = {
  CPU_DIVISOR: 1000,
  MEMORY_DIVISOR: 1024,
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_DAY: 86400,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_MINUTE: 60
} as const;

//three types secret
const SECRET_NAME_MAP: Partial<Record<DBType, string[]>> = {
  mongodb: ['{dbName}-mongodb-account-root', '{dbName}-mongo-conn-credential'],
  redis: ['{dbName}-redis-account-default', '{dbName}-redis-conn-credential'],
  kafka: ['{dbName}-broker-account-admin', '{dbName}-conn-credential']
};

//connection string
const CONNECTION_PROTOCOLS: Partial<Record<DBType, string>> = {
  kafka: '{endpoint}',
  milvus: '{endpoint}',
  mongodb: 'mongodb://{username}:{password}@{host}:{port}',
  postgresql: 'postgresql://{username}:{password}@{host}:{port}',
  'apecloud-mysql': 'mysql://{username}:{password}@{host}:{port}',
  redis: 'redis://{username}:{password}@{host}:{port}'
};

//default secret names
const getSecretNames = (dbName: string, dbType: DBType): string[] => {
  const baseSecrets = SECRET_NAME_MAP[dbType] || ['{dbName}-conn-credential'];
  return baseSecrets.map((name) => name.replace('{dbName}', dbName));
};

//decode secret data
const decodeSecretData = (data: Record<string, string> | undefined, key: string): string | null => {
  return data?.[key] ? Buffer.from(data[key], 'base64').toString('utf-8').trim() : null;
};

//extract all secret data at once
const extractSecretData = (data: Record<string, string> | undefined) => ({
  endpoint: decodeSecretData(data, 'endpoint'),
  host: decodeSecretData(data, 'host'),
  port: decodeSecretData(data, 'port'),
  username: decodeSecretData(data, 'username'),
  password: decodeSecretData(data, 'password')
});

//connection
const buildConnectionString = (
  dbType: DBType,
  { endpoint, host, port, username, password }: ReturnType<typeof extractSecretData>
): string | null => {
  if (!host || !port || !username || !password) return null;

  const protocol = CONNECTION_PROTOCOLS[dbType];
  if (!protocol) return null;

  return protocol
    .replace('{endpoint}', endpoint || `${host}:${port}`)
    .replace('{host}', host)
    .replace('{port}', port)
    .replace('{username}', username)
    .replace('{password}', password);
};

//format uptime
const formatUptime = (startTime: string | Date): string | null => {
  const seconds = Math.floor(
    (Date.now() - new Date(startTime).getTime()) / CONSTANTS.MILLISECONDS_PER_SECOND
  );
  const d = Math.floor(seconds / CONSTANTS.SECONDS_PER_DAY);
  const h = Math.floor((seconds % CONSTANTS.SECONDS_PER_DAY) / CONSTANTS.SECONDS_PER_HOUR);
  const m = Math.floor((seconds % CONSTANTS.SECONDS_PER_HOUR) / CONSTANTS.SECONDS_PER_MINUTE);
  return d > 0 ? `${d}d${h}h` : h > 0 ? `${h}h${m}m` : `${m}m`;
};

//calculate component resources
const calculateComponentResources = (spec: any) => {
  const cpu = cpuFormatToM(spec.resources?.limits?.cpu || '0') / CONSTANTS.CPU_DIVISOR;
  const memory = memoryFormatToMi(spec.resources?.limits?.memory || '0') / CONSTANTS.MEMORY_DIVISOR;
  const storage = storageFormatToNum(
    spec.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage || '0'
  );

  return {
    name: spec.name,
    status: (spec as any).status?.phase || 'unknown',
    resource: {
      cpu,
      memory,
      storage,
      replicas: spec.replicas || 0
    }
  };
};

//calculate resource totals
const calculateResourceTotals = (components: ReturnType<typeof calculateComponentResources>[]) => {
  return components.reduce(
    (acc, component) => {
      const replicas = component.resource?.replicas || 0;
      acc.totalReplicas += replicas;
      acc.totalCpu += (component.resource?.cpu || 0) * replicas;
      acc.totalMemory += (component.resource?.memory || 0) * replicas;
      acc.totalStorage += (component.resource?.storage || 0) * replicas;
      return acc;
    },
    { totalReplicas: 0, totalCpu: 0, totalMemory: 0, totalStorage: 0 }
  );
};

//convert raw data to schema
export const raw2schema = (raw: DBDetailType): z.Infer<typeof dbDetailSchema> => {
  const autoBackup = raw.autoBackup
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
    : undefined;

  return {
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
};

//get database
export async function getDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof updateDatabaseSchemas.pathParams>;
  }
): Promise<z.Infer<typeof ClusterObjectSchema>> {
  const { namespace, k8sCustomObjects, k8sCore } = k8s;
  const dbName = request.params.databaseName;

  const { body: cluster } = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    dbName
  )) as { body: KbPgClusterType };

  const rawDbType =
    cluster.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] || 'postgresql';
  const dbType = ((rawDbType as string) === 'mysql' ? 'apecloud-mysql' : rawDbType) as DBType;

  const fetchConnection = async () => {
    const secretNames = getSecretNames(dbName, dbType);

    for (const secretName of secretNames) {
      try {
        const secret = await k8sCore.readNamespacedSecret(secretName, namespace);
        if (!secret.body?.data) continue;

        const secretData = extractSecretData(secret.body.data);
        const connectionString = buildConnectionString(dbType, secretData);

        if (connectionString) {
          return { ...secretData, connectionString };
        }
      } catch {
        continue;
      }
    }
    return null;
  };

  const fetchPublicConnection = async () => {
    try {
      const service = await k8sCore.readNamespacedService(`${dbName}-export`, namespace);
      const nodePort = service.body?.spec?.ports?.[0]?.nodePort;
      return nodePort ? { port: nodePort, connectionString: null } : null;
    } catch {
      return null;
    }
  };

  const fetchPods = async () => {
    try {
      const { body } = await k8sCore.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app.kubernetes.io/instance=${dbName}`
      );

      return body.items.map((pod) => ({
        name: pod.metadata?.name || null,
        status: pod.status?.phase || null,
        upTime: pod.status?.startTime ? formatUptime(pod.status.startTime) : null,
        containers:
          pod.status?.containerStatuses?.map((c) => ({
            name: c.name,
            ready: c.ready,
            state: c.state,
            restartCount: c.restartCount
          })) || null
      }));
    } catch {
      return [];
    }
  };

  const components = (cluster.spec?.componentSpecs || []).map((spec) => {
    const resourceData = calculateComponentResources(spec);
    return {
      ...resourceData,
      status: (cluster.status?.components as any)?.[spec.name]?.phase || 'unknown'
    };
  });

  const resourceTotals = calculateResourceTotals(components);
  const { totalReplicas, totalCpu, totalMemory, totalStorage } = resourceTotals;

  const [privateConnection, publicConnection, pods] = await Promise.all([
    fetchConnection(),
    fetchPublicConnection(),
    fetchPods()
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
