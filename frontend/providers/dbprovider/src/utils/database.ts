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

export const POLARDBX_MIN_COMPONENT_CPU = 1000;
export const POLARDBX_MIN_COMPONENT_MEMORY = 1024;
export const POLARDBX_MIN_STORAGE = 3;
export const POLARDBX_GMS_MAX_STORAGE = 3;
export const POLARDBX_COMPONENT_COUNT = 4;
export const POLARDBX_MIN_CPU = POLARDBX_MIN_COMPONENT_CPU * POLARDBX_COMPONENT_COUNT;
export const POLARDBX_MIN_MEMORY = POLARDBX_MIN_COMPONENT_MEMORY * POLARDBX_COMPONENT_COUNT;

export const validatePolarDBXResources = (data: {
  dbType: DBType;
  cpu: number;
  memory: number;
  storage: number;
  replicas: number;
}) => {
  if (data.dbType !== DBTypeEnum.polardbx) {
    return;
  }

  if (data.cpu < POLARDBX_MIN_CPU || data.memory < POLARDBX_MIN_MEMORY) {
    throw new Error(
      'PolarDB-X requires at least 4C and 4Gi so every component instance keeps at least 1C and 1Gi'
    );
  }

  if (data.storage < POLARDBX_MIN_STORAGE) {
    throw new Error('PolarDB-X requires at least 3Gi storage');
  }

  if (data.replicas % 2 === 0) {
    throw new Error('PolarDB-X replicas must be odd numbers; even replica counts cannot start');
  }
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
  [DBTypeEnum.polardbx]: {
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
    const kafkaHost = port.split(':')[0].replace('-server', '-broker');
    const kafkaPort = port.split(':')[1];
    const host = kafkaHost + '.' + namespace + '.svc';

    return {
      host,
      port: kafkaPort,
      connection: `${host}:${kafkaPort}`
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
  // get secret
  const secretName = dbName + '-conn-credential';

  const secret = await k8sCore.readNamespacedSecret(secretName, namespace);

  if (!secret.body?.data) {
    throw Error('secret is empty');
  }

  const username = Buffer.from(secret.body.data[dbTypeMap[dbType].usernameKey] || '', 'base64')
    .toString('utf-8')
    .trim();

  const password = Buffer.from(secret.body.data[dbTypeMap[dbType].passwordKey] || '', 'base64')
    .toString('utf-8')
    .trim();

  const hostKey = Buffer.from(secret.body.data[dbTypeMap[dbType].hostKey] || '', 'base64')
    .toString('utf-8')
    .trim();

  const host = hostKey.includes('.svc') ? hostKey : hostKey + `.${namespace}.svc`;

  const port = Buffer.from(secret.body.data[dbTypeMap[dbType].portKey] || '', 'base64')
    .toString('utf-8')
    .trim();

  return {
    username,
    password,
    host,
    port,
    body: secret.body
  };
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

  function getPolardbxReplicaMap(replicas: number) {
    return {
      gms: 1,
      dn: replicas,
      cn: 1,
      cdc: 1
    } as const;
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
    case DBTypeEnum.polardbx:
      const polardbxSharedCpu = POLARDBX_MIN_COMPONENT_CPU;
      const polardbxSharedMemory = POLARDBX_MIN_COMPONENT_MEMORY;
      const polardbxReplicaMap = getPolardbxReplicaMap(data.replicas);
      const gmsStorage = Math.min(data.storage, POLARDBX_GMS_MAX_STORAGE);
      const dnStorage = Math.max(data.storage - POLARDBX_GMS_MAX_STORAGE, 0);

      return {
        gms: {
          cpuMemory: allocateCM(polardbxSharedCpu, polardbxSharedMemory),
          storage: gmsStorage,
          other: {
            replicas: polardbxReplicaMap.gms
          }
        },
        dn: {
          cpuMemory: allocateCM(
            Math.max(cpu - polardbxSharedCpu * 3, polardbxSharedCpu),
            Math.max(memory - polardbxSharedMemory * 3, polardbxSharedMemory)
          ),
          storage: dnStorage,
          other: {
            replicas: polardbxReplicaMap.dn
          }
        },
        cn: {
          cpuMemory: allocateCM(polardbxSharedCpu, polardbxSharedMemory),
          storage: 0,
          other: {
            replicas: polardbxReplicaMap.cn
          }
        },
        cdc: {
          cpuMemory: allocateCM(polardbxSharedCpu, polardbxSharedMemory),
          storage: 0,
          other: {
            replicas: polardbxReplicaMap.cdc
          }
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
        'kafka-server': quarterResource,
        'kafka-broker': quarterResource,
        controller: quarterResource,
        'kafka-exporter': quarterResource
      };
    case DBTypeEnum.milvus:
      return {
        milvus: {
          cpuMemory: getPercentResource(0.4),
          storage: Math.max(Math.round(data.storage / 3), 1)
        },
        etcd: {
          cpuMemory: getPercentResource(0.3),
          storage: Math.max(Math.round(data.storage / 3), 1)
        },
        minio: {
          cpuMemory: getPercentResource(0.3),
          storage: Math.max(Math.round(data.storage / 3), 1)
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
