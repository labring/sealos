import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    jsonRes(res, {
      data: {
        SEALOS_CLOUD_DOMAIN: process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io'
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      data: 'get env error'
    });
  }
}
