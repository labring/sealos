import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export type Response = {
  domain?: string;
  env_storage_className?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<Response>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      env_storage_className: process.env.STORAGE_CLASSNAME || ''
    }
  });
}
