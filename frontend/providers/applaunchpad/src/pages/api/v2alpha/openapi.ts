import { jsonRes } from '@/services/backend/response';
import { createOpenApiDocument } from '@/types/v2alpha/openapi';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Create document at runtime to use the current domain from AppConfig
    const document = createOpenApiDocument();
    return res.json(document);
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
