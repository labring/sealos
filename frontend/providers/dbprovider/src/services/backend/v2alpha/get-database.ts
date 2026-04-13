import { updateDatabaseSchemas } from '@/types/apis/v2alpha';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail } from '@/utils/adapt';
import { dbDetailSchema } from '@/types/schemas/v2alpha/db';
import {
  CPUResourceEnum,
  DBDetailType,
  MemoryResourceEnum,
  ReplicasResourceEnum
} from '@/types/db';

type DbDetail = z.infer<typeof dbDetailSchema>;
type ConnectionInfo = DbDetail['connection'];
type PodInfo = DbDetail['pods'][number];

export const raw2schema = (
  raw: DBDetailType,
  connection?: ConnectionInfo,
  pods?: PodInfo[]
): DbDetail => {
  const dbEditSchemaFromRaw: DbDetail = {
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
    createdAt: raw.createTime,
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
      : undefined,
    parameterConfig: raw.parameterConfig,
    uid: raw.id,
    resourceType: 'cluster',
    operationalStatus: {},
    connection: connection ?? {
      privateConnection: null,
      publicConnection: null
    },
    pods: pods ?? []
  };

  return dbEditSchemaFromRaw;
};

async function getConnectionInfo(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  dbName: string,
  dbType: string
): Promise<ConnectionInfo> {
  const { k8sCore, namespace } = k8s;

  try {
    const [secretResult, serviceResult] = await Promise.all([
      k8sCore.readNamespacedSecret(`${dbName}-conn-credential`, namespace).catch(() => null),
      k8sCore
        .listNamespacedService(
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          `app.kubernetes.io/instance=${dbName}`
        )
        .catch(() => null)
    ]);

    let username = '';
    let password = '';
    let port = '';

    // 解析 Secret
    if (secretResult?.body?.data) {
      const secretData = secretResult.body.data;
      username = secretData.username
        ? Buffer.from(secretData.username, 'base64').toString('utf-8')
        : '';
      password = secretData.password
        ? Buffer.from(secretData.password, 'base64').toString('utf-8')
        : '';
      port = secretData.port ? Buffer.from(secretData.port, 'base64').toString('utf-8') : '';
    }

    let privateHost = '';
    let privatePort = port;
    let publicHost = '';
    let publicPort = '';

    if (serviceResult?.body?.items) {
      const services = serviceResult.body.items;
      const privateService = services.find(
        (svc: any) =>
          svc.spec?.type === 'ClusterIP' &&
          svc.metadata?.name !== `${dbName}-headless` &&
          svc.metadata?.name !== `${dbName}-postgresql-headless` &&
          (svc.metadata?.name === dbName ||
            svc.metadata?.name === `${dbName}-postgresql` ||
            svc.metadata?.labels?.['app.kubernetes.io/instance'] === dbName)
      );

      if (privateService) {
        privateHost = `${privateService.metadata?.name}.${namespace}.svc.cluster.local`;
        const postgresqlPort = privateService.spec?.ports?.find(
          (p: any) => p.name === 'tcp-postgresql' || p.name === 'tcp'
        );
        privatePort =
          postgresqlPort?.port?.toString() ||
          privateService.spec?.ports?.[0]?.port?.toString() ||
          privatePort ||
          '5432';
      }

      const publicService = services.find((svc: any) => {
        const isPublicType = svc.spec?.type === 'LoadBalancer' || svc.spec?.type === 'NodePort';
        if (!isPublicType) return false;

        const serviceName = svc.metadata?.name || '';
        const labelInstance = svc.metadata?.labels?.['app.kubernetes.io/instance'];

        const nameMatches =
          serviceName === dbName ||
          serviceName === `${dbName}-export` ||
          serviceName === `${dbName}-external` ||
          serviceName === `${dbName}-public` ||
          serviceName.startsWith(`${dbName}-`);

        return nameMatches || labelInstance === dbName;
      });

      if (publicService) {
        const serviceType = publicService.spec?.type;

        if (serviceType === 'LoadBalancer') {
          const ingress = publicService.status?.loadBalancer?.ingress;
          if (ingress && ingress.length > 0) {
            const loadBalancerIngress = ingress[0];
            publicHost = loadBalancerIngress?.ip || loadBalancerIngress?.hostname || '';
          }

          publicPort =
            publicService.spec?.ports?.[0]?.port?.toString() ||
            publicService.spec?.ports?.[0]?.targetPort?.toString() ||
            privatePort;
        } else if (serviceType === 'NodePort') {
          const ports = publicService.spec?.ports || [];

          const nodePortInfo = ports.find((p: any) => p.nodePort) || ports[0];

          if (nodePortInfo?.nodePort) {
            publicPort = nodePortInfo.nodePort.toString();
          }

          let resolvedHosts: string[] = [];

          try {
            const { body: nodeList } = await k8s.k8sCore.listNode();
            resolvedHosts = nodeList.items
              .map((node: any) => {
                const addresses = node.status?.addresses || [];
                const externalIP = addresses.find((addr: any) => addr.type === 'ExternalIP');
                const internalIP = addresses.find((addr: any) => addr.type === 'InternalIP');
                return externalIP?.address || internalIP?.address;
              })
              .filter(Boolean);
          } catch (nodeErr) {
            try {
              const { body: podList } = await k8s.k8sCore.listNamespacedPod(
                namespace,
                undefined,
                undefined,
                undefined,
                undefined,
                `app.kubernetes.io/instance=${dbName}`
              );
              resolvedHosts = (podList.items || [])
                .map((pod: any) => pod.status?.hostIP)
                .filter(Boolean);
            } catch (podErr) {}
          }

          if (resolvedHosts.length > 0) {
            publicHost = resolvedHosts[0];
          }
        }

        if (!publicHost || !publicPort) {
          publicHost = '';
          publicPort = '';
        }
      }
    }

    const buildConnectionString = (host: string, port: string, db: string) => {
      switch (dbType) {
        case 'postgresql':
          return `postgresql://${username}:${password}@${host}:${port}/${db}`;
        case 'apecloud-mysql':
          return `mysql://${username}:${password}@${host}:${port}/${db}`;
        case 'mysql':
          return `mysql://${username}:${password}@${host}:${port}/${db}`;
        case 'mongodb':
          return `mongodb://${username}:${password}@${host}:${port}/${db}`;
        case 'redis':
          return `redis://${username}:${password}@${host}:${port}`;
        default:
          return `${dbType}://${username}:${password}@${host}:${port}`;
      }
    };

    const defaultDb = dbName;

    const result: ConnectionInfo = {
      privateConnection: privateHost
        ? {
            endpoint: `${privateHost}:${privatePort}`,
            host: privateHost,
            port: privatePort,
            username: username,
            password: password,
            connectionString: buildConnectionString(privateHost, privatePort, defaultDb)
          }
        : null,
      publicConnection:
        publicHost && publicPort ? buildConnectionString(publicHost, publicPort, defaultDb) : null
    };

    return result;
  } catch (error) {
    return {
      privateConnection: null,
      publicConnection: null
    };
  }
}

async function getPodsInfo(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  dbName: string
): Promise<PodInfo[]> {
  const { k8sCore, namespace } = k8s;

  try {
    const { body } = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/instance=${dbName}`
    );

    const pods: PodInfo[] = (body.items || []).map((pod: any) => ({
      name: pod.metadata?.name || '',
      status: pod.status?.phase?.toLowerCase() || 'unknown'
    }));

    return pods;
  } catch (error) {
    return [];
  }
}

export async function getDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof updateDatabaseSchemas.pathParams>;
  }
) {
  const { namespace, k8sCustomObjects } = k8s;
  const dbName = request.params.databaseName;

  const clusterResult = await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    dbName
  );

  const clusterBody = clusterResult.body as KbPgClusterType;
  const adaptedDetail = adaptDBDetail(clusterBody);
  const actualDbType = adaptedDetail.dbType;

  const [connectionInfo, podsInfo] = await Promise.all([
    getConnectionInfo(k8s, dbName, actualDbType),
    getPodsInfo(k8s, dbName)
  ]);

  return raw2schema(adaptedDetail, connectionInfo, podsInfo);
}
