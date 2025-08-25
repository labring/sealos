import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetApps } from '../getApps';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const apps = await GetApps({ req });

    jsonRes(res, { data: apps });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
