import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

export type Response = {
  SEALOS_DOMAIN: string;
  INGRESS_SECRET: string;
  CPU_MARK_LIST?: string;
  MEMORY_MARK_LIST?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes<Response>(res, {
    data: {
      SEALOS_DOMAIN: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      INGRESS_SECRET: process.env.INGRESS_SECRET || 'wildcard-cert',
      CPU_MARK_LIST: process.env.CPU_MARK_LIST,
      MEMORY_MARK_LIST: process.env.MEMORY_MARK_LIST
    }
  });
}
