import { updateDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { dbDetailV1Schema } from '@/types/schemas/db';
import { formatPodTime, cpuFormatToM, memoryFormatToMi, storageFormatToNum } from '@/utils/tools';
import type { V1Pod, V1Service } from '@kubernetes/client-node';

type DatabaseDetail = z.infer<typeof dbDetailV1Schema>;

type ComponentSpec = NonNullable<KbPgClusterType['spec']>['componentSpecs'][number];

function parseDbType(cluster: KbPgClusterType): string {
  return (
    (cluster?.metadata?.labels?.['clusterdefinition.kubeblocks.io/name'] as string | undefined) ??
    'postgresql'
  );
}

function calcTotalResource(componentSpecs: ComponentSpec[] = []) {
  return componentSpecs.reduce(
    (acc, comp) => {
      const cpu = cpuFormatToM(comp?.resources?.limits?.cpu || '0');
      const memory = memoryFormatToMi(comp?.resources?.limits?.memory || '0');
      const storage = storageFormatToNum(
        comp?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage || '0'
      );
      const replicas = comp.replicas || 1;

      acc.cpu += cpu;
      acc.memory += memory;
      acc.storage += storage;
      acc.totalCpu += cpu * replicas;
      acc.totalMemory += memory * replicas;
      acc.totalStorage += storage * replicas;
      return acc;
    },
    {
      cpu: 0,
      memory: 0,
      storage: 0,
      totalCpu: 0,
      totalMemory: 0,
      totalStorage: 0
    }
  );
}

function formatComponentResource(comp: ComponentSpec) {
  const cpu = cpuFormatToM(comp?.resources?.limits?.cpu || '0');
  const memory = memoryFormatToMi(comp?.resources?.limits?.memory || '0');
  const storage = storageFormatToNum(
    comp?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage || '0'
  );

  return {
    cpu: Number((cpu / 1000).toFixed(4)),
    memory: Number((memory / 1024).toFixed(8)),
    storage,
    replicas: comp.replicas || 1
  };
}

function adaptDatabaseDetailV1(
  cluster: KbPgClusterType,
  pods: V1Pod[],
  publicPort: number | null
): DatabaseDetail {
  const dbType = parseDbType(cluster);
  const dbStatus = cluster?.status?.phase || 'UnKnow';
  const componentSpecs = cluster.spec?.componentSpecs || [];

  const totalResource = calcTotalResource(componentSpecs);
  const mainComponent = componentSpecs.find((comp) => comp.name === dbType);

  const components = componentSpecs.map((comp) => ({
    name: comp.name,
    status: dbStatus,
    resource: formatComponentResource(comp)
  }));

  const adaptedPods =
    pods?.map((pod) => {
      const containers =
        pod.status?.containerStatuses?.map((container) => ({
          name: container.name,
          ready: container.ready,
          state: container.state ? (container.state as unknown as Record<string, unknown>) : null,
          restartCount: container.restartCount
        })) || [];

      return {
        name: pod.metadata?.name || '',
        status: pod.status?.phase || 'Unknown',
        upTime: formatPodTime(pod.metadata?.creationTimestamp),
        containers
      };
    }) || [];

  const backup = cluster.spec?.backup;
  const creationTimestamp = cluster.metadata?.creationTimestamp;
  const createdAt =
    typeof creationTimestamp === 'string'
      ? creationTimestamp
      : creationTimestamp
        ? new Date(creationTimestamp as any).toISOString()
        : null;

  return {
    name: cluster.metadata?.name || '',
    kind: cluster.kind || 'Cluster',
    type: dbType,
    version: cluster?.metadata?.labels?.['clusterversion.kubeblocks.io/name'] || '',
    operationalStatus: {
      createdAt: createdAt
    },
    status: dbStatus,
    resource: {
      cpu: Number((totalResource.cpu / 1000).toFixed(4)),
      memory: Number((totalResource.memory / 1024).toFixed(8)),
      storage: totalResource.storage,
      replicas: mainComponent?.replicas || 1
    },
    components,
    connection: {
      privateConnection: null,
      publicConnection: {
        port: publicPort,
        connectionString: null
      }
    },
    backup: backup
      ? {
          cronExpression: backup.cronExpression ?? null,
          enabled: backup.enabled ?? null,
          method: backup.method ?? null,
          pitrEnabled: backup.pitrEnabled ?? null,
          repoName: backup.repoName ?? null,
          retentionPeriod: backup.retentionPeriod ?? null
        }
      : null,
    pods: adaptedPods
  };
}

function resolvePublicPort(services: V1Service[]): number | null {
  const service = services.find(
    (svc) => svc.spec?.type === 'LoadBalancer' || svc.spec?.type === 'NodePort'
  );
  if (!service) return null;
  const firstPort = service.spec?.ports?.[0];
  if (!firstPort) return null;
  return firstPort.nodePort ?? firstPort.port ?? null;
}

export async function getDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof updateDatabaseSchemas.pathParams>;
  }
) {
  const { namespace, k8sCustomObjects, k8sCore } = k8s;
  const clusterResponse = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    request.params.databaseName
  )) as { body: KbPgClusterType };

  const podsResponse = await k8s.k8sCore.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app.kubernetes.io/instance=${request.params.databaseName}`
  );

  let publicPort: number | null = null;
  try {
    const servicesResponse = await k8sCore.listNamespacedService(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/instance=${request.params.databaseName}`
    );
    publicPort = resolvePublicPort(servicesResponse.body.items);
  } catch (err) {
    // service discovery is best-effort
    console.warn('[getDatabase] failed to resolve public port:', err);
  }

  return adaptDatabaseDetailV1(clusterResponse.body, podsResponse.body.items, publicPort);
}
