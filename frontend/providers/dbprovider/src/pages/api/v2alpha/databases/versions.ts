import { authSession } from '@/services/backend/auth';
import { getK8s, K8sApi } from '@/services/backend/kubernetes';
import type { NextApiRequest, NextApiResponse } from 'next';
import { versionListSchema } from '@/types/schemas/db';
import { DBTypeEnum } from '@/constants/db';
import z from 'zod';
import { sendError, sendK8sError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    return sendError(res, {
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Unauthorized, please login again.'
    });
  }

  // Try user kubeconfig first, fall back to in-cluster service account
  const k8s = (await getK8s({ kubeconfig }).catch(async () => {
    const kc = K8sApi();
    return getK8s({ kubeconfig: kc.exportConfig() });
  }))!;

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

      const { k8sCustomObjects } = k8s;

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
      console.log('error get db by name', err);
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
