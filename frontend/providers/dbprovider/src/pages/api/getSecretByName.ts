import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { DBType } from '@/types/db';
import { DBTypeEnum } from '@/constants/db';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { dbName, dbType } = req.query as { dbName: string; dbType: DBType };
    if (!dbName) {
      throw new Error('dbName is empty');
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // get secret
    const secretName = dbName + '-conn-credential';

    const secret = await k8sCore.readNamespacedSecret(secretName, namespace);

    if (!secret.body?.data) {
      return jsonRes(res, {
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

    const port = Buffer.from(secret.body.data[dbTypeMap[dbType].portKey] || '', 'base64').toString(
      'utf-8'
    );

    const connectionInfo = buildConnectionInfo(dbType, username, password, host, port, namespace);

    const data = {
      username,
      password,
      host,
      port,
      ...connectionInfo
    };

    jsonRes<SecretResponse>(res, {
      data
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
