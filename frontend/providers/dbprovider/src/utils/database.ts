import * as k8s from '@kubernetes/client-node';
import { KubeFileSystem } from './kubeFileSystem';
import { DBType } from '@/types/db';
import { DBTypeEnum } from '@/constants/db';

const base = {
  passwordKey: 'password',
  usernameKey: 'username',
  portKey: 'port',
  hostKey: 'host'
};

const dbTypeMap = {
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

  const username = Buffer.from(
    secret.body.data[dbTypeMap[dbType].usernameKey] || '',
    'base64'
  ).toString('utf-8');

  const password = Buffer.from(
    secret.body.data[dbTypeMap[dbType].passwordKey] || '',
    'base64'
  ).toString('utf-8');

  const hostKey = Buffer.from(secret.body.data[dbTypeMap[dbType].hostKey] || '', 'base64').toString(
    'utf-8'
  );

  const host = hostKey.includes('.svc') ? hostKey : hostKey + `.${namespace}.svc`;

  const port = Buffer.from(secret.body.data[dbTypeMap[dbType].portKey] || '', 'base64').toString(
    'utf-8'
  );

  return {
    username,
    password,
    host,
    port
  };
}
