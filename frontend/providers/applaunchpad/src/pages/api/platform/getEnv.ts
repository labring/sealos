import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    jsonRes(res, {
      data: {
        SEALOS_DOMAIN: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
        INGRESS_SECRET: process.env.INGRESS_SECRET || 'wildcard-cert'
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
