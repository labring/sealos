import { getPayloadWithoutVerification, verifyToken } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { DBType } from '@/types/db';
import { DBTypeEnum } from '@/constants/db';
import { NextRequest } from 'next/server';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBListItem } from '@/utils/adapt';

export type SecretResponse = {
  username: string;
  password: string;
  host: string;
  port: string;
  connection: string;
};

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
  }
};

const buildConnectionInfo = (
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

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { payload, token } = getPayloadWithoutVerification(req.headers);
    if (!payload || !token) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }
    const devboxName = payload.devboxName;
    const namespace = payload.namespace;

    const { k8sCore, k8sCustomObjects } = await getK8s({
      kubeconfig:
        process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '',
      useDefaultConfig: process.env.NODE_ENV !== 'development'
    });

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace);

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8');

    if (!verifyToken(token, jwtSecret)) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }

    const clustersResult = await k8sCustomObjects.listNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters'
    );
    const clusters = (clustersResult.body as { items: KbPgClusterType[] }).items.map(
      adaptDBListItem
    );

    const dbList = clusters.map(async (cluster) => {
      const dbName = cluster.name;
      const dbType = cluster.dbType;
      let secretName = dbName + '-conn-credential';
      if (dbType === DBTypeEnum.redis) {
        secretName = dbName + '-redis-account-default';
      }
      if (dbType === DBTypeEnum.mongodb) {
        secretName = dbName + '-mongodb-account-root';
      }

      const secret = await k8sCore.readNamespacedSecret(secretName, namespace);

      if (!secret.body?.data) {
        return jsonRes({
          code: 500,
          message: 'secret is empty'
        });
      }

      const username = Buffer.from(
        secret.body.data[dbTypeMap[dbType].usernameKey] || '',
        'base64'
      ).toString('utf-8');

      const password = Buffer.from(
        secret.body.data[dbTypeMap[dbType].passwordKey] || '',
        'base64'
      ).toString('utf-8');

      const hostKey = Buffer.from(
        secret.body.data[dbTypeMap[dbType].hostKey] || '',
        'base64'
      ).toString('utf-8');

      const host = hostKey.includes('.svc') ? hostKey : hostKey + `.${namespace}.svc`;

      const port = Buffer.from(
        secret.body.data[dbTypeMap[dbType].portKey] || '',
        'base64'
      ).toString('utf-8');

      const connectionInfo = buildConnectionInfo(dbType, username, password, host, port, namespace);

      const data = {
        dbName,
        dbType,
        username,
        password,
        host,
        port,
        ...connectionInfo
      };

      return data;
    });

    const dbListResult = await Promise.all(dbList);

    return jsonRes({
      data: {
        dbList: dbListResult
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
