import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { DeleteAppByName, DeleteAppParams } from '../delApp';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as DeleteAppParams;
    if (!name) {
      throw new Error('deploy name is empty');
    }

    await DeleteAppByName({ name, req });

    jsonRes(res, {
      message: 'successfully deleted'
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
