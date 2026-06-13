import { jsonRes } from '@/services/backend/response';

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateRepo } from '@/services/backend/template-repo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await updateRepo();

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
