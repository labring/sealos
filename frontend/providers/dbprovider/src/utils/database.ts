import * as k8s from '@kubernetes/client-node';
import { KubeFileSystem } from './kubeFileSystem';
import { DBComponentsName, DBEditType, DBType } from '@/types/db';
import { DBComponentNameMap, DBTypeEnum, RedisHAConfig } from '@/constants/db';
import { formatNumber, str2Num } from './tools';

const base = {
  passwordKey: 'password',
  usernameKey: 'username',
  portKey: 'port',
  hostKey: 'host'
};

export const dbTypeMap = {
  [DBTypeEnum.postgresql]: {
    ...base,
    connectKey: 'postgresql'
  },
  [DBTypeEnum.mongodb]: {
    ...base,
    connectKey: 'mongodb'
  },
  [DBTypeEnum.mysql]: {
    ...base,
    connectKey: 'mysql'
  },
  [DBTypeEnum.redis]: {
    ...base,
    connectKey: 'redis'
  },
  [DBTypeEnum.kafka]: {
    ...base,
    connectKey: 'kafka',
    portKey: 'endpoint',
    hostKey: 'endpoint'
  },
  [DBTypeEnum.qdrant]: {
    ...base,
    connectKey: 'qdrant'
  },
  [DBTypeEnum.nebula]: {
    ...base,
    connectKey: 'nebula'
  },
  [DBTypeEnum.weaviate]: {
    ...base,
    connectKey: 'weaviate'
  },
  [DBTypeEnum.milvus]: {
    ...base,
    portKey: 'port',
    hostKey: 'host',
    connectKey: 'milvus'
  },
  [DBTypeEnum.pulsar]: {
    ...base,
    connectKey: 'pulsar'
  },
  [DBTypeEnum.clickhouse]: {
    ...base,
    connectKey: 'clickhouse'
  }
};

export const buildConnectionInfo = (
  dbType: DBType,
  username: string,
  password: string,
  host: string,
  port: string,
  namespace: string
) => {
  if (dbTypeMap[dbType].connectKey === 'milvus') {
    return {
      connection: `${host}:${port}`
    };
  } else if (dbTypeMap[dbType].connectKey === 'kafka') {
    return {
      connection: `${host}:${port}`
    };
  } else {
    return {
      connection: `${dbTypeMap[dbType].connectKey}://${username}:${password}@${host}:${port}`
    };
  }
};

export async function fetchDBSecret(
  k8sCore: k8s.CoreV1Api,
  dbName: string,
  dbType: DBType,
  namespace: string
) {
  // get secret: try multiple common naming conventions, but DO NOT throw if not found
  const candidates: string[] = [];
  if (dbType === DBTypeEnum.mongodb) candidates.push(`${dbName}-mongodb-account-root`);
  if (dbType === DBTypeEnum.redis) candidates.push(`${dbName}-redis-account-default`);
  if (dbType === DBTypeEnum.kafka) candidates.push(`${dbName}-broker-account-admin`);
  candidates.push(`${dbName}-conn-credential`);

  let secret: k8s.V1Secret | undefined;
  for (const name of candidates) {
    try {
      console.log('[fetchDBSecret] Name:', name);
      console.log('[fetchDBSecret] Namespace:', namespace);
      const res = await k8sCore.readNamespacedSecret(name, namespace);
      console.log('[fetchDBSecret] Res: Get');
      if (res?.body) {
        secret = res.body;
        console.log('[fetchDBSecret] Secret:', secret);
        break;
      }
    } catch (e: any) {
      // continue trying next candidate on 404; do not interrupt
      const statusCode = e?.response?.statusCode || e?.statusCode;
      if (statusCode && Number(statusCode) === 404) {
        continue;
      }
      continue;
    }
  }

  // If still not found, return empty placeholders to avoid interruption
  if (!secret || !secret.data) {
    return {
      username: '',
      password: '',
      host: '',
      port: '',
      body: secret
    };
  }
}

type resourcesDistributeMap = Partial<
  Record<
    DBComponentsName,
    {
      cpuMemory: {
        limits: {
          cpu: string;
          memory: string;
        };
        requests: {
          cpu: string;
          memory: string;
        };
      };
      storage: number;
      other?: Record<string, any>;
    }
  >
>;

export function distributeResources(data: {
  dbType: DBType;
  cpu: number;
  memory: number;
  storage: number;
  replicas: number;
  forDisplay?: boolean;
}): resourcesDistributeMap {
  const [cpu, memory] = [str2Num(Math.floor(data.cpu)), str2Num(data.memory)];
  const dbType = data.dbType;

  function allocateCM(cpu: number, memory: number) {
    if (data.forDisplay) {
      return {
        limits: {
          cpu: `${cpu / 1000} C`,
          memory: memory / 1024 >= 1 ? `${memory / 1024} G` : `${memory} M`
        },
        requests: {
          cpu: `${Math.floor((cpu / 1000) * 0.1)} M`,
          memory:
            memory / 1024 >= 1
              ? `${Math.floor((memory / 1024) * 0.1)} G`
              : `${Math.floor(memory * 0.1)} M`
        }
      };
    }
    return {
      limits: {
        cpu: `${formatNumber(cpu)}m`,
        memory: `${formatNumber(memory)}Mi`
      },
      requests: {
        cpu: `${Math.floor(cpu * 0.1)}m`,
        memory: `${Math.floor(memory * 0.1)}Mi`
      }
    };
  }

  function getPercentResource(percent: number) {
    return allocateCM(cpu * percent, memory * percent);
  }

  //

  switch (dbType) {
    case DBTypeEnum.postgresql:
    case DBTypeEnum.mongodb:
    case DBTypeEnum.mysql:
      return {
        [DBComponentNameMap[dbType][0]]: {
          cpuMemory: getPercentResource(1),
          storage: data.storage
        }
      };
    case DBTypeEnum.redis:
      const redisResource = getPercentResource(1);
      const sentinelResource = allocateCM(cpu * 0.5, memory * 0.5);
      const sentinelStorage = Math.round(data.storage * 0.5);
      return {
        redis: {
          cpuMemory: redisResource,
          storage: data.storage
        },
        'redis-sentinel': {
          cpuMemory: sentinelResource,
          storage: sentinelStorage,
          other: {
            replicas: data.replicas
          }
        }
      };
    case DBTypeEnum.kafka:
      const brokerResource = {
        cpuMemory: getPercentResource(0.5),
        storage: Math.max(Math.round((data.storage * 2) / 3), 1)
      };
      const quarterResource = {
        cpuMemory: getPercentResource(0.25),
        storage: Math.max(Math.round((data.storage * 1) / 3), 1)
      };
      return {
        'kafka-broker': brokerResource,
        controller: quarterResource,
        'kafka-exporter': {
          ...quarterResource,
          storage: 0
        }
      };
    case DBTypeEnum.milvus:
      return {
        milvus: {
          cpuMemory: getPercentResource(0.5),
          storage: Math.max(Math.round(data.storage * 0.5), 1)
        },
        etcd: {
          cpuMemory: getPercentResource(0.25),
          storage: Math.max(Math.round(data.storage * 0.25), 1)
        },
        minio: {
          cpuMemory: getPercentResource(0.25),
          storage: Math.max(Math.round(data.storage * 0.25), 1)
        }
      };
    case DBTypeEnum.clickhouse:
      return {
        clickhouse: {
          cpuMemory: getPercentResource(0.5),
          storage: Math.max(Math.round(data.storage * 0.5), 1)
        },
        'ch-keeper': {
          cpuMemory: getPercentResource(0.25),
          storage: Math.max(Math.round(data.storage * 0.25), 1)
        },
        zookeeper: {
          cpuMemory: getPercentResource(0.25),
          storage: Math.max(Math.round(data.storage * 0.25), 1)
        }
      };
    default:
      const resource = getPercentResource(DBComponentNameMap[dbType].length);
      return DBComponentNameMap[dbType].reduce((acc: resourcesDistributeMap, cur) => {
        acc[cur] = {
          cpuMemory: resource,
          storage: Math.max(Math.round(data.storage / DBComponentNameMap[dbType].length), 1)
        };
        return acc;
      }, {});
  }
}
