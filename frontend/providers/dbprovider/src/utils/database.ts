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
    connectKey: 'kafka'
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
  // Get secret name based on database type
  let secretName: string;

  switch (dbType) {
    case DBTypeEnum.mysql: // apecloud-mysql
      secretName = `${dbName}-conn-credential`;
      break;
    case DBTypeEnum.clickhouse:
      secretName = `${dbName}-conn-credential`;
      break;
    case DBTypeEnum.milvus:
      secretName = `${dbName}-conn-credential`;
      break;
    case DBTypeEnum.postgresql:
      secretName = `${dbName}-conn-credential`;
      break;
    case DBTypeEnum.kafka:
      secretName = `${dbName}-kafka-combine-account-admin`;
      break;
    case DBTypeEnum.redis:
      secretName = `${dbName}-redis-account-default`;
      break;
    case DBTypeEnum.mongodb:
      secretName = `${dbName}-mongodb-account-root`;
      break;
    default:
      secretName = `${dbName}-conn-credential`;
      break;
  }

  console.log('[fetchDBSecret] Trying secret name:', secretName);

  try {
    const res = await k8sCore.readNamespacedSecret(secretName, namespace);
    if (!res?.body?.data) {
      throw Error(`Secret ${secretName} has no data`);
    }

    console.log('[fetchDBSecret] Found secret:', secretName);
    const secret = res.body;

    const username = Buffer.from(secret.data?.[dbTypeMap[dbType].usernameKey] || '', 'base64')
      .toString('utf-8')
      .trim();

    const password = Buffer.from(secret.data?.[dbTypeMap[dbType].passwordKey] || '', 'base64')
      .toString('utf-8')
      .trim();

    // Get host and port based on database type according to requirements
    let host: string;
    let port: string;

    switch (dbType) {
      case DBTypeEnum.mongodb:
        host = `${dbName}-mongodb.${namespace}.svc`;
        port = '27017';
        break;
      case DBTypeEnum.redis:
        host = `${dbName}-redis-redis.${namespace}.svc`;
        port = '6379';
        break;
      case DBTypeEnum.clickhouse:
        host = `${dbName}-clickhouse.${namespace}.svc`;
        port = '8123';
        break;
      case DBTypeEnum.kafka:
        host = `${dbName}-broker-advertised-listener-0.${namespace}.svc`;
        port = '9092';
        break;
      default:
        // For other database types, try to get from secret or use default pattern
        const hostKey = Buffer.from(secret.data?.[dbTypeMap[dbType].hostKey] || '', 'base64')
          .toString('utf-8')
          .trim();
        host = hostKey.includes('.svc') ? hostKey : hostKey + `.${namespace}.svc`;

        const portKey = Buffer.from(secret.data?.[dbTypeMap[dbType].portKey] || '', 'base64')
          .toString('utf-8')
          .trim();
        port = portKey;
        break;
    }

    console.log('[fetchDBSecret] Successfully retrieved secret:', secretName);

    return {
      username,
      password,
      host,
      port,
      body: secret
    };
  } catch (e: any) {
    const statusCode = e?.response?.statusCode || e?.statusCode;
    if (statusCode && Number(statusCode) === 404) {
      console.log('[fetchDBSecret] Secret not found:', secretName);
      throw Error(
        `Secret not found for database ${dbName} of type ${dbType}. Secret name: ${secretName}`
      );
    }
    console.log('[fetchDBSecret] Error fetching secret:', secretName, e.message);
    throw Error(`Failed to fetch secret for database ${dbName} of type ${dbType}: ${e.message}`);
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
      const dbComponents = DBComponentNameMap[dbType];
      if (!dbComponents || dbComponents.length === 0) {
        console.warn(`Unknown database type: ${dbType}, falling back to default configuration`);
        return {
          [dbType]: {
            cpuMemory: getPercentResource(1),
            storage: data.storage
          }
        };
      }
      return {
        [dbComponents[0]]: {
          cpuMemory: getPercentResource(1),
          storage: data.storage
        }
      };
    case DBTypeEnum.redis:
      // Please ref RedisHAConfig in  /constants/db.ts
      let rsRes = RedisHAConfig(data.replicas > 1);
      return {
        redis: {
          cpuMemory: getPercentResource(1),
          storage: Math.max(data.storage - 1, 1)
        },
        'redis-sentinel': {
          cpuMemory: allocateCM(rsRes.cpu, rsRes.memory),
          storage: rsRes.storage,
          other: {
            replicas: rsRes.replicas
          }
        }
      };
    case DBTypeEnum.kafka:
      const kafkaComponents = DBComponentNameMap[dbType] || [
        'kafka-server',
        'kafka-broker',
        'controller',
        'kafka-exporter'
      ];
      const quarterResource = {
        cpuMemory: getPercentResource(0.25),
        storage: Math.max(Math.round(data.storage / kafkaComponents.length), 1)
      };

      return {
        'kafka-broker': {
          cpuMemory: getPercentResource(0.25),
          storage: Math.max(Math.round(data.storage / 2), 1)
        },
        controller: {
          cpuMemory: getPercentResource(0.5),
          storage: Math.max(Math.round(data.storage / 2), 1)
        },
        'kafka-exporter': {
          cpuMemory: getPercentResource(0.25),
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
      const components = DBComponentNameMap[dbType];
      if (!components || components.length === 0) {
        console.warn(`Unknown database type: ${dbType}, falling back to default configuration`);
        return {
          [dbType]: {
            cpuMemory: getPercentResource(1),
            storage: data.storage
          }
        };
      }
      const resource = getPercentResource(components.length);
      return components.reduce((acc: resourcesDistributeMap, cur) => {
        acc[cur] = {
          cpuMemory: resource,
          storage: Math.max(Math.round(data.storage / components.length), 1)
        };
        return acc;
      }, {});
  }
}
