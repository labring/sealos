import { jsonRes } from '@/services/backend/response';
import { openApiDocument } from '@/types/openapi';
import { SEALOS_DOMAIN } from '@/store/static';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.json(openApiDocument(SEALOS_DOMAIN));
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
