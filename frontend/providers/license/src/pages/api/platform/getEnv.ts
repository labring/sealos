import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { hashCrypto } from '@/utils/crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export type Response = {
  domain?: string;
  hid: string; // PASSWORD_SALT
  LICENSE_DOMAIN: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<Response>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      hid: hashCrypto(process.env.PASSWORD_SALT || ''),
      LICENSE_DOMAIN: process.env.LICENSE_DOMAIN || 'cloud.sealos.io'
    }
  });
}
