import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { DBTypeEnum } from '@/constants/db';
import { DBVersionMap } from '@/store/static';
import { fetchAllDatabaseVersionsWithLabels } from '@/services/backend/db-version';

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
    const DBVersionMap = await fetchAllDatabaseVersionsWithLabels();

    jsonRes(res, {
      data: DBVersionMap
    });
  } catch (error) {
    console.log('Error in getVersion API:', error);
    jsonRes(res, {
      data: MOCK
    });
  }
}
