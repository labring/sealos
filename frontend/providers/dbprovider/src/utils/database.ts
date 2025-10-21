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
  // Define primary and backup secret names based on database type
  const getSecretNames = (dbType: DBType, dbName: string) => {
    const backupSecretName = `${dbName}-conn-credential`;

    switch (dbType) {
      case DBTypeEnum.mysql: // apecloud-mysql
        return { primary: backupSecretName, backup: null }; // Same for old and new
      case DBTypeEnum.clickhouse:
        return { primary: backupSecretName, backup: null }; // Same for old and new
      case DBTypeEnum.milvus:
        return { primary: backupSecretName, backup: null }; // Same for old and new
      case DBTypeEnum.postgresql:
        return { primary: backupSecretName, backup: null }; // Same for old and new
      case DBTypeEnum.kafka:
        return { primary: `${dbName}-broker-account-admin`, backup: backupSecretName };
      case DBTypeEnum.redis:
        return { primary: `${dbName}-redis-account-default`, backup: backupSecretName };
      case DBTypeEnum.mongodb:
        return { primary: `${dbName}-mongodb-account-root`, backup: backupSecretName };
      default:
        return { primary: backupSecretName, backup: null };
    }
  };

  const { primary: primarySecretName, backup: backupSecretName } = getSecretNames(dbType, dbName);
  let secretName = primarySecretName;

  // Helper function to attempt to get secret
  const attemptGetSecret = async (secretNameToTry: string, isBackup: boolean = false) => {
    try {
      const res = await k8sCore.readNamespacedSecret(secretNameToTry, namespace);
      if (!res?.body?.data) {
        throw Error(`Secret ${secretNameToTry} has no data`);
      }
      const secret = res.body;

      // For backup secrets, we might need different password keys for some database types
      let passwordKey = dbTypeMap[dbType].passwordKey;
      if (isBackup) {
        // Backup secrets might use 'admin-password' instead of 'password' for some types
        if (dbType === DBTypeEnum.clickhouse || dbType === DBTypeEnum.kafka) {
          passwordKey = 'admin-password';
        }
      }

      const username = Buffer.from(secret.data?.[dbTypeMap[dbType].usernameKey] || '', 'base64')
        .toString('utf-8')
        .trim();

      const password = Buffer.from(secret.data?.[passwordKey] || '', 'base64')
        .toString('utf-8')
        .trim();

      console.log(
        `[fetchDBSecret] Successfully retrieved ${isBackup ? 'backup' : 'primary'} secret:`,
        secretNameToTry
      );

      return { username, password, secret };
    } catch (error) {
      throw error;
    }
  };

  let username: string, password: string, secret: any;

  try {
    // Try primary secret first
    ({ username, password, secret } = await attemptGetSecret(secretName, false));
  } catch (primaryError: any) {
    const statusCode = primaryError?.response?.statusCode || primaryError?.statusCode;

    // If primary secret failed with 404 and backup secret exists, try backup
    if (
      statusCode &&
      Number(statusCode) === 404 &&
      backupSecretName &&
      backupSecretName !== secretName
    ) {
      console.log(
        `[fetchDBSecret] Primary secret ${secretName} not found, trying backup secret ${backupSecretName}`
      );

      try {
        ({ username, password, secret } = await attemptGetSecret(backupSecretName, true));
        secretName = backupSecretName; // Update secretName to backup secret name for logging
      } catch (backupError: any) {
        // Both primary and backup failed
        throw Error(
          `Failed to fetch secret for database ${dbName} of type ${dbType}. Primary secret ${primarySecretName} not found, backup secret ${backupSecretName} also failed: ${backupError.message}`
        );
      }
    } else {
      // Primary secret failed with non-404 error or no backup available
      throw Error(
        `Failed to fetch secret for database ${dbName} of type ${dbType}: ${primaryError.message}`
      );
    }
  }

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

  console.log(`[fetchDBSecret] Successfully processed secret:`, {
    secretName,
    isBackup: secretName === backupSecretName,
    host,
    port
  });

  return {
    username,
    password,
    host,
    port,
    body: secret
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
