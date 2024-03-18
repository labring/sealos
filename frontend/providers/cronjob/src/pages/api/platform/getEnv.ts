import { defaultDomain } from '@/constants/keys';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export type EnvResponse = {
  domain: string;
  applaunchpadUrl: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<EnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || defaultDomain,
      applaunchpadUrl: process.env.APPLAUNCHPAD_URL || `applaunchpad.${process.env.SEALOS_DOMAIN}`
    }
  });
}
