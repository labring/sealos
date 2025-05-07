import { DeleteAppByNameQuerySchema } from '@/constants/schema';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { DeleteAppByName, DeleteAppParams } from '../delApp';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const parseResult = DeleteAppByNameQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        error: parseResult.error
      });
    }

    const { name } = parseResult.data;

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
