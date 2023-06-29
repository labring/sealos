import type { NextApiRequest, NextApiResponse } from 'next';
import * as yaml from 'js-yaml';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { DBTypeEnum } from '@/constants/db';

export type Response = Record<
  `${DBTypeEnum}`,
  {
    id: string;
    label: string;
  }[]
>;

const DBVersionMap = {
  [DBTypeEnum.postgresql]: [{ id: 'postgresql-14.8.0', label: 'postgresql-14.8.0' }],
  [DBTypeEnum.mongodb]: [{ id: 'mongodb-5.0.14', label: 'mongodb-5.0.14' }],
  [DBTypeEnum.mysql]: [{ id: 'ac-mysql-8.0.30', label: 'ac-mysql-8.0.30' }]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    jsonRes(res, {
      data: DBVersionMap
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
