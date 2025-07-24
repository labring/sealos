import { jsonRes } from '@/services/backend/response';
import { document } from '@/types/apis';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.json(document);
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
