import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export type SystemEnvResponse = {
  domain?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, regionUid } = await verifyAccessToken(req);
    const {} = req.body as {};

    jsonRes(res, {
      data: {
        domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io'
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
