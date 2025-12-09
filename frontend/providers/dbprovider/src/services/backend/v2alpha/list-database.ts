import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail } from '@/utils/adapt';
import { dblistItemSchema } from '@/types/schemas/v2alpha/db';
import {
  CPUResourceEnum,
  DBDetailType,
  MemoryResourceEnum,
  ReplicasResourceEnum
} from '@/types/db';
import { fetchDBSecret, buildConnectionInfo } from '@/utils/database';
import { KBBackupNameLabel } from '@/constants/db';

type DbListItem = z.infer<typeof dblistItemSchema>;
type ConnectionInfo = DbListItem['connection'];
type PodItem = DbListItem['pods'][number];

const raw2schema = async (
  raw: DBDetailType,
  cluster: KbPgClusterType,
  k8s: Awaited<ReturnType<typeof getK8s>>
): Promise<DbListItem> => {
  const autoBackup = raw.autoBackup;
  const { k8sCore, namespace } = k8s;

  // Get connection information
  const connectionInfo: ConnectionInfo = {
    privateConnection: null,
    publicConnection: null
  };

  try {
    const { username, password, host, port } = await fetchDBSecret(
      k8sCore,
      raw.dbName,
      raw.dbType,
      namespace
    );

    const connection = buildConnectionInfo(raw.dbType, username, password, host, port, namespace);

    connectionInfo.privateConnection = {
      endpoint: host,
      host,
      port,
      username,
      password,
      connectionString: connection.connection ?? ''
    };
  } catch (error) {
    console.log(`Failed to get connection info for:`, error);
  }

  // Get Pod information
  const podsInfo: DbListItem['pods'] = [];

  try {
    const {
      body: { items: pods }
    } = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/instance=${raw.dbName},!${KBBackupNameLabel}`
    );

    podsInfo.push(
      ...pods.map(
        (pod): PodItem => ({
          name: pod.metadata?.name || '',
          status: pod.status?.phase?.toLowerCase?.() || 'unknown'
        })
      )
    );
  } catch (error) {
    console.log(`Failed to get pods:`, error);
  }

  const dbEditSchemaFromRaw: DbListItem = {
    terminationPolicy: raw.terminationPolicy.toLowerCase() as 'delete' | 'wipeout',
    name: raw.dbName,
    type: raw.dbType,
    version: raw.dbVersion,
    quota: {
      cpu: (raw.cpu as CPUResourceEnum) / 1000,
      memory: (raw.memory as MemoryResourceEnum) / 1024,
      storage: raw.storage as number,
      replicas: raw.replicas as ReplicasResourceEnum
    },
    id: raw.id,
    status: raw.status.value.toLowerCase() as
      | 'creating'
      | 'starting'
      | 'stopping'
      | 'stopped'
      | 'running'
      | 'updating'
      | 'specUpdating'
      | 'rebooting'
      | 'upgrade'
      | 'verticalScaling'
      | 'volumeExpanding'
      | 'failed'
      | 'unknown'
      | 'deleting',
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
    autoBackup: autoBackup
      ? {
          ...autoBackup,
          week: autoBackup.week as (
            | 'monday'
            | 'tuesday'
            | 'wednesday'
            | 'thursday'
            | 'friday'
            | 'saturday'
            | 'sunday'
          )[],
          saveType: autoBackup.saveType as 'days' | 'weeks' | 'months' | 'hours'
        }
      : undefined,
    uid: cluster.metadata?.uid || '',
    resourceType: 'cluster',
    operationalStatus: {},
    connection: connectionInfo,
    pods: podsInfo
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

  const clusters = response?.body?.items || [];
  const adaptedData = clusters.map(adaptDBDetail);

  // Process each item asynchronously to get connection and pod information
  const data = await Promise.all(
    adaptedData.map((raw, index) => raw2schema(raw, clusters[index], k8s))
  );

  return data;
}
