import type { NextApiRequest, NextApiResponse } from 'next';
import { K8sApi } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { DBTypeEnum } from '@/constants/db';
import * as k8s from '@kubernetes/client-node';

export type Response = Record<
  `${DBTypeEnum}`,
  {
    id: string;
    label: string;
  }[]
>;

const MOCK = {
  [DBTypeEnum.postgresql]: [{ id: 'postgresql-14.8.0', label: 'postgresql-14.8.0' }],
  [DBTypeEnum.mongodb]: [{ id: 'mongodb-5.0.14', label: 'mongodb-5.0.14' }],
  [DBTypeEnum.mysql]: [{ id: 'ac-mysql-8.0.30', label: 'ac-mysql-8.0.30' }],
  [DBTypeEnum.redis]: [{ id: 'redis-7.0.6', label: 'redis-7.0.6' }]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const DBVersionMap: Response = {
      [DBTypeEnum.postgresql]: [],
      [DBTypeEnum.mongodb]: [],
      [DBTypeEnum.mysql]: [],
      [DBTypeEnum.redis]: []
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
