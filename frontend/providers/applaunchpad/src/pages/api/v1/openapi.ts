import { jsonRes } from '@/services/backend/response';
import { openApiDocument } from '@/types/openapi';
import { Config } from '@/config';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.json(openApiDocument(Config().cloud.domain));
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
