import { K8sApi } from '@/services/backend/kubernetes';
import type { NextApiRequest, NextApiResponse } from 'next';
import { versionListSchema } from '@/types/schemas/db';
import { DBTypeEnum } from '@/constants/db';
import z from 'zod';
import * as k8s from '@kubernetes/client-node';
import { sendError, sendK8sError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const DBVersion: z.Infer<typeof versionListSchema> = {
        [DBTypeEnum.postgresql]: [],
        [DBTypeEnum.mongodb]: [],
        [DBTypeEnum.mysql]: [],
        [DBTypeEnum.polardbx]: [],
        [DBTypeEnum.redis]: [],
        [DBTypeEnum.kafka]: [],
        [DBTypeEnum.qdrant]: [],
        [DBTypeEnum.nebula]: [],
        [DBTypeEnum.weaviate]: [],
        [DBTypeEnum.milvus]: [],
        [DBTypeEnum.pulsar]: [],
        [DBTypeEnum.clickhouse]: []
      };

      const kc = K8sApi();
      const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);

      const { body } = (await k8sCustomObjects.listClusterCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        'clusterversions'
      )) as any;

      body.items.forEach((item: any) => {
        const db = item?.spec?.clusterDefinitionRef as `${DBTypeEnum}`;
        if (DBVersion[db] && item?.metadata?.name && !DBVersion[db].includes(item.metadata.name)) {
          DBVersion[db].unshift(item.metadata.name);
        }
      });

      return res.json(DBVersion);
    } catch (err) {
      console.log('error get db versions', err);
      return sendK8sError(res, err);
    }
  } else {
    return sendError(res, {
      status: 405,
      type: ErrorType.CLIENT_ERROR,
      code: ErrorCode.METHOD_NOT_ALLOWED,
      message: 'Method not allowed. Use GET.'
    });
  }
}
