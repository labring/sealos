import { jsonRes } from '@/services/backend/response';
import { document } from '@/types/apis/v2alpha';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Set headers for JSON file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"');
    return res.status(200).json(document);
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
