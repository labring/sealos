import { jsonRes } from '@/services/backend/response';

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateRepo } from '@/services/backend/template-repo';
import { readmeCache } from '@/utils/readmeCache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await updateRepo();
    readmeCache.clear();

    jsonRes(res, {
      data: `success update template`,
      code: 200
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
