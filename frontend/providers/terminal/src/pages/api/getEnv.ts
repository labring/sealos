import { ApiResp } from '@/interfaces/api';
import { jsonRes } from '@/service/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    jsonRes(res, {
      data: {
        SITE: process.env.SITE || 'https://cloud.sealos.io'
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      data: err
    });
  }
}
