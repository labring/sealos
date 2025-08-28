import { authSession } from '@/services/backend/auth';
import { getK8s, K8sApi } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { createDatabaseSchemas, getDatabaseSchemas, updateDatabaseSchemas } from '@/types/apis';
import { updateDatabase } from '@/services/backend/apis/update-database';
import { getDatabase } from '@/services/backend/apis/get-database';
import { adaptDBDetail } from '@/utils/adapt';
import { createDatabase } from '@/services/backend/apis/create-database';
import { dbDetailSchema, dbTypeSchema, versionListSchema } from '@/types/schemas/db';
import path from 'node:path/win32';
import { deleteDatabase } from '@/services/backend/apis/delete-database';
import { DBTypeEnum } from '@/constants/db';
import { result } from 'lodash';
import z from 'zod';
import { DBVersionMap } from '@/store/static';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kc = K8sApi();

  const k8s = (await getK8s({ kubeconfig: kc.exportConfig() }))!;

  if (req.method === 'GET') {
    try {
      const DBVersion: z.Infer<typeof versionListSchema> = {
        [DBTypeEnum.postgresql]: [],
        [DBTypeEnum.mongodb]: [],
        [DBTypeEnum.mysql]: [],
        [DBTypeEnum.redis]: [],
        [DBTypeEnum.kafka]: [],
        [DBTypeEnum.qdrant]: [],
        [DBTypeEnum.nebula]: [],
        [DBTypeEnum.weaviate]: [],
        [DBTypeEnum.milvus]: [],
        [DBTypeEnum.pulsar]: [],
        [DBTypeEnum.clickhouse]: []
      };

      // source price
      const { k8sCustomObjects } = k8s;

      const { body } = (await k8sCustomObjects.listClusterCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        'clusterversions'
      )) as any;

      body.items.forEach((item: any) => {
        const db = item?.spec?.clusterDefinitionRef as `${DBTypeEnum}`;
        if (
          DBVersionMap[db] &&
          item?.metadata?.name &&
          !DBVersionMap[db].find((db) => db.id === item.metadata.name)
        ) {
          DBVersionMap[db].unshift(item.metadata.name);
        }
      });

      jsonRes(res, {
        data: DBVersionMap
      });
      jsonRes(res, {
        data: result
      });
    } catch (err) {
      console.log('error get db by name', err);
      jsonRes(res, handleK8sError(err));
    }
  } else {
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }
}
