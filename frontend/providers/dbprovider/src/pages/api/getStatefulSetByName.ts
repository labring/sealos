import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { DBTypeEnum } from '@/constants/db';
import { DBType } from '@/types/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, dbType } = req.query as {
      name: string;
      dbType: DBType;
    };

    if (!name) {
      throw new Error('name is empty');
    }

    const dbTypeMap = {
      [DBTypeEnum.postgresql]: {
        key: 'postgresql'
      },
      [DBTypeEnum.mongodb]: {
        key: 'mongodb'
      },
      [DBTypeEnum.mysql]: {
        key: 'mysql'
      },
      [DBTypeEnum.redis]: {
        key: 'redis'
      },
      [DBTypeEnum.kafka]: {
        key: 'kafka'
      },
      [DBTypeEnum.qdrant]: {
        key: 'qdrant'
      },
      [DBTypeEnum.nebula]: {
        key: 'nebula'
      },
      [DBTypeEnum.weaviate]: {
        key: 'weaviate'
      },
      [DBTypeEnum.milvus]: {
        key: 'milvus'
      }
    };

    const temp = `${name}-${dbTypeMap[dbType].key}`;

    jsonRes(res, {
      data: await GetStatefulSetByName({ name: temp, req })
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function GetStatefulSetByName({ name, req }: { name: string; req: NextApiRequest }) {
  const { k8sApp, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const { body } = await k8sApp.readNamespacedStatefulSetStatus(name, namespace);

  return body;
}
