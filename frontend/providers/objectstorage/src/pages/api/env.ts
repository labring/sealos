import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export type EnvResponse = {
  HOSTING_POD_CPU_REQUIREMENT: number;
  HOSTING_POD_MEMORY_REQUIREMENT: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return jsonRes(res, {
    data: {
      HOSTING_POD_CPU_REQUIREMENT: Number(process.env.HOSTING_POD_CPU_REQUIREMENT ?? 0),
      HOSTING_POD_MEMORY_REQUIREMENT: Number(process.env.HOSTING_POD_MEMORY_REQUIREMENT ?? 0)
    }
  });
}
