import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export type SystemEnvResponse = {
  domain?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<SystemEnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io'
    }
  });
}
