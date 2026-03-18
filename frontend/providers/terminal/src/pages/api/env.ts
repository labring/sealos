import { jsonRes } from '@/service/response';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return jsonRes(res, {
    data: {
      CPU_REQUIREMENT: Number(process.env.CPU_REQUIREMENT ?? 0),
      MEMORY_REQUIREMENT: Number(process.env.MEMORY_REQUIREMENT ?? 0)
    }
  });
}
