import type { NextApiRequest, NextApiResponse } from 'next';
import { K8sApi } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { DBTypeEnum } from '@/constants/db';
import * as k8s from '@kubernetes/client-node';
import { DBVersionMap } from '@/store/static';

export type Response = Record<
  `${DBTypeEnum}`,
  {
    id: string;
    label: string;
  }[]
>;

const MOCK: Response = DBVersionMap;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const DBVersionMap: Response = {
      [DBTypeEnum.postgresql]: [],
      [DBTypeEnum.mongodb]: [],
      [DBTypeEnum.mysql]: [],
      [DBTypeEnum.redis]: [],
      [DBTypeEnum.kafka]: [],
      [DBTypeEnum.qdrant]: [],
      [DBTypeEnum.nebula]: [],
      [DBTypeEnum.weaviate]: [],
      [DBTypeEnum.milvus]: []
    };

    // source price
    const kc = K8sApi();
    const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);

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
        DBVersionMap[db].push({
          id: item.metadata.name,
          label: item.metadata.name
        });
      }
    });

    jsonRes(res, {
      data: DBVersionMap
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, {
      data: MOCK
    });
  }
}
