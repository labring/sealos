import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export type Response = {
  SEALOS_DOMAIN: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  jsonRes<Response>(res, {
    data: {
      SEALOS_DOMAIN: process.env.SEALOS_DOMAIN || 'cloud.sealos.io'
    }
  });
}
