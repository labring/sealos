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
      [DBTypeEnum.milvus]: [],
      [DBTypeEnum.pulsar]: [],
      [DBTypeEnum.clickhouse]: []
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
      const clusterDefinitionRef = item?.spec?.clusterDefinitionRef as string;

      let db: `${DBTypeEnum}` | undefined;

      if (clusterDefinitionRef === 'mysql' || clusterDefinitionRef === 'apecloud-mysql') {
        db = DBTypeEnum.mysql;
      } else {
        db = clusterDefinitionRef as `${DBTypeEnum}`;
      }

      if (
        db &&
        DBVersionMap[db] &&
        item?.metadata?.name &&
        !DBVersionMap[db].find((version) => version.id === item.metadata.name)
      ) {
        // Filter out mysql-8.0.33 version
        if (db === DBTypeEnum.mysql && item.metadata.name === 'mysql-8.0.33') {
          return;
        }

        DBVersionMap[db].unshift({
          id: item.metadata.name,
          label: item.metadata.name
        });
      }
    });

    // Sort MySQL versions to ensure mysql-5.7.42 appears last
    if (DBVersionMap[DBTypeEnum.mysql].length > 0) {
      DBVersionMap[DBTypeEnum.mysql].sort((a, b) => {
        // Move mysql-5.7.42 to the end
        if (a.id === 'mysql-5.7.42') return 1;
        if (b.id === 'mysql-5.7.42') return -1;
        // Keep other versions in their original order
        return 0;
      });
    }

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
