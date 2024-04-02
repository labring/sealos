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

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { dbName, dbType } = req.query as { dbName: string; dbType: DBType };
    if (!dbName) {
      throw new Error('dbName is empty');
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const base = {
      passwordKey: 'password',
      usernameKey: 'username',
      portKey: 'port',
      hostKey: 'host'
    };

    const data = await (async () => {
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
          passwordKey: 'clientPassword',
          usernameKey: 'clientUser',
          portKey: 'endpoint',
          hostKey: 'superusers'
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
          connectKey: 'milvus'
        }
      };
      // get secret
      const secretName = dbName + '-conn-credential';

      const secret = await k8sCore.readNamespacedSecret(secretName, namespace);

      if (!secret.body?.data) {
        return Promise.reject('Get secret errpr');
      }

      const username = Buffer.from(
        secret.body.data[dbTypeMap[dbType].usernameKey],
        'base64'
      ).toString('utf-8');

      const password = Buffer.from(
        secret.body.data[dbTypeMap[dbType].passwordKey],
        'base64'
      ).toString('utf-8');

      const hostKey = Buffer.from(secret.body.data[dbTypeMap[dbType].hostKey], 'base64').toString(
        'utf-8'
      );
      const host = hostKey.includes('.svc') ? hostKey : hostKey + `.${namespace}.svc`;

      const port = Buffer.from(secret.body.data[dbTypeMap[dbType].portKey], 'base64').toString(
        'utf-8'
      );

      return {
        username,
        password,
        host,
        port,
        connection: `${dbTypeMap[dbType].connectKey}://${username}:${password}@${host}:${port}`
      };
    })();
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
